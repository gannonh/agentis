import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable, Writable } from "node:stream";
import {
  client,
  ndJsonStream,
  type RequestPermissionResponse,
  type ClientConnection,
} from "@agentclientprotocol/sdk";
import { Effect, Schema } from "effect";
import type { DriveInput } from "./engine.js";
import { mutateForEngine } from "./store.js";
import type { RunId } from "./schema.js";
import {
  classifyFailure,
  safeFailureDetail,
  documentedCapabilities,
  normalizedHistory,
  type ProviderState,
} from "./provider-contract.js";
import { spawnCursorInContainer } from "./cursor-container.js";

const Questions = Schema.Struct({
  toolCallId: Schema.String,
  title: Schema.optional(Schema.String),
  questions: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      prompt: Schema.String,
      options: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
      allowMultiple: Schema.optional(Schema.Boolean),
    }),
  ),
});
const Plan = Schema.Struct({
  toolCallId: Schema.String,
  plan: Schema.String,
  todos: Schema.Array(Schema.Unknown),
});
type Session = {
  stop: () => void;
  connection: ClientConnection;
  sessionId: string | null;
  approval: ((decision: "allowed" | "denied" | "canceled") => void) | null;
  answer: ((answers: Readonly<Record<string, string>>) => void) | null;
  cancelInput: (() => void) | null;
  timer: ReturnType<typeof setTimeout>;
};
const sessions = new Map<RunId, Session>();
const update = (input: DriveInput, change: (state: ProviderState) => ProviderState) => {
  const engine = mutateForEngine(input.store.path);
  try {
    engine.providerState(input.runId, change);
  } finally {
    engine.close();
  }
};
const engineCall = <T>(
  input: DriveInput,
  work: (engine: ReturnType<typeof mutateForEngine>) => T,
): T => {
  const engine = mutateForEngine(input.store.path);
  try {
    return work(engine);
  } finally {
    engine.close();
  }
};
export const interruptCursor = (runId: RunId) => {
  const session = sessions.get(runId);
  if (!session) return;
  sessions.delete(runId);
  clearTimeout(session.timer);
  session.cancelInput?.();
  session.approval?.("canceled");
  if (session.sessionId)
    void session.connection.agent
      .notify("session/cancel", { sessionId: session.sessionId })
      .catch(() => {});
  session.connection.close();
  try {
    session.stop();
  } catch (error) {
    process.stderr.write(`run ${runId} cleanup failed: ${String(error)}\n`);
  }
};
export const interruptAllCursor = () => {
  for (const id of sessions.keys()) interruptCursor(id);
};
export const resolveCursorApproval = async (runId: RunId, decision: "allowed" | "denied") => {
  sessions.get(runId)?.approval?.(decision);
  if (decision === "denied") {
    await new Promise<void>((resolve) => setImmediate(resolve));
    interruptCursor(runId);
  }
};
export const answerCursorInput = (runId: RunId, answers: Readonly<Record<string, string>>) =>
  sessions.get(runId)?.answer?.(answers);

export const spawnCursor = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      const snapshot = await Effect.runPromise(input.store.snapshot());
      const run = snapshot.runs.find((run) => run.id === input.runId);
      if (!run || (!input.loadSession && run.status !== "queued")) return;
      if (input.loadSession && !engineCall(input, (engine) => engine.isLoading(input.runId)))
        return;
      if (input.loadSession)
        update(input, (state) => ({
          ...state,
          loadStatus: "loading",
          failure: null,
          failureDetail: null,
        }));
      mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
      const stub = process.env.AGENTIS_CURSOR_STUB;
      const processHandle =
        stub && input.executionBoundary === "unverified-host-scratch"
          ? (() => {
              const child = spawn(process.execPath, [stub], {
                cwd: input.workspace,
                env: { PATH: process.env.PATH ?? "" },
                stdio: ["pipe", "pipe", "pipe"],
              });
              return {
                child,
                stop: () => {
                  child.kill("SIGTERM");
                },
              };
            })()
          : spawnCursorInContainer({
              runId: input.runId,
              workspace: input.workspace,
              dataRoot: dirname(input.store.path),
              ...(input.loadSession ? { loadSession: true } : {}),
            });
      let text = "";
      const replay: string[] = [];
      const app = client({ name: "agentis" });
      let session: Session;
      app.onNotification("session/update", ({ params }) => {
        if (sessions.get(input.runId) !== session) return;
        if (params.update.sessionUpdate === "agent_thought_chunk") return;
        if (session.sessionId && params.sessionId !== session.sessionId)
          throw new Error("invalid provider session");
        if (input.loadSession) replay.push(JSON.stringify(params.update));
        else
          update(input, (state) => ({
            ...state,
            history: [...state.history, JSON.stringify(params.update)],
          }));
        if (
          params.update.sessionUpdate === "agent_message_chunk" &&
          params.update.content.type === "text"
        )
          text += params.update.content.text;
      });
      app.onRequest(
        "session/request_permission",
        ({ params }) =>
          new Promise<RequestPermissionResponse>((resolve) => {
            if (
              input.loadSession ||
              sessions.get(input.runId) !== session ||
              session.approval ||
              session.answer
            ) {
              resolve({ outcome: { outcome: "cancelled" } });
              return;
            }
            engineCall(input, (engine) => {
              if (engine.bumpAction(input.runId, input.taskId).exhausted)
                throw new Error("action budget exhausted");
              engine.waitApproval({
                runId: input.runId,
                taskId: input.taskId,
                tool: "cursor-permission",
                argumentDigest: createHash("sha256").update(JSON.stringify(params)).digest("hex"),
                nowMs: Date.now(),
              });
            });
            update(input, (state) => ({ ...state, pendingPrompt: JSON.stringify(params) }));
            session.approval = (decision) => {
              session.approval = null;
              update(input, (state) => ({ ...state, pendingPrompt: null }));
              const option = params.options.find(
                (option) => option.kind === (decision === "allowed" ? "allow_once" : "reject_once"),
              );
              resolve({
                outcome:
                  decision === "canceled" || !option
                    ? { outcome: "cancelled" }
                    : { outcome: "selected", optionId: option.optionId },
              });
            };
          }),
      );
      app.onRequest(
        "cursor/ask_question",
        Schema.decodeUnknownSync(Questions, { onExcessProperty: "preserve" }),
        ({ params }) =>
          new Promise((resolve) => {
            if (
              input.loadSession ||
              sessions.get(input.runId) !== session ||
              session.approval ||
              session.answer
            ) {
              resolve({ outcome: { outcome: "cancelled" } });
              return;
            }
            engineCall(input, (engine) =>
              engine.waitInput(input.runId, JSON.stringify(params), Date.now()),
            );
            update(input, (state) => ({ ...state, pendingPrompt: JSON.stringify(params) }));
            session.cancelInput = () => resolve({ outcome: { outcome: "cancelled" } });
            session.answer = (answers) => {
              session.cancelInput = null;
              session.answer = null;
              update(input, (state) => ({ ...state, pendingPrompt: null }));
              resolve({
                outcome: {
                  outcome: "answered",
                  answers: params.questions.map((question) => ({
                    questionId: question.id,
                    selectedOptionIds: answers[question.id] ? [answers[question.id]] : [],
                  })),
                },
              });
            };
          }),
      );
      app.onRequest(
        "cursor/create_plan",
        Schema.decodeUnknownSync(Plan, { onExcessProperty: "preserve" }),
        ({ params }) =>
          new Promise((resolve) => {
            if (
              input.loadSession ||
              sessions.get(input.runId) !== session ||
              session.approval ||
              session.answer
            ) {
              resolve({ outcome: { outcome: "cancelled" } });
              return;
            }
            engineCall(input, (engine) =>
              engine.waitApproval({
                runId: input.runId,
                taskId: input.taskId,
                tool: "cursor-plan",
                argumentDigest: createHash("sha256").update(params.plan).digest("hex"),
                nowMs: Date.now(),
              }),
            );
            update(input, (state) => ({ ...state, pendingPrompt: JSON.stringify(params) }));
            session.approval = (decision) => {
              session.approval = null;
              update(input, (state) => ({ ...state, pendingPrompt: null }));
              resolve({
                outcome: {
                  outcome:
                    decision === "allowed"
                      ? "accepted"
                      : decision === "denied"
                        ? "rejected"
                        : "cancelled",
                },
              });
            };
          }),
      );
      const connection = app.connect(
        ndJsonStream(
          Writable.toWeb(processHandle.child.stdin),
          Readable.toWeb(processHandle.child.stdout),
        ),
      );
      session = {
        connection,
        stop: processHandle.stop,
        sessionId: null,
        approval: null,
        answer: null,
        cancelInput: null,
        timer: setTimeout(() => {
          fail(new Error("Cursor initialization timed out"));
        }, 30000),
      };
      sessions.set(input.runId, session);
      const fail = (error: unknown) => {
        if (sessions.get(input.runId) !== session) return;
        const message = error instanceof Error ? error.message : String(error);
        update(input, (state) => ({
          ...state,
          failure: classifyFailure(message),
          failureDetail: safeFailureDetail(message),
          ...(input.loadSession ? { loadStatus: "failed" as const } : {}),
          pendingPrompt: null,
        }));
        engineCall(input, (engine) => engine.fail(input.runId, input.taskId, message, Date.now()));
        interruptCursor(input.runId);
      };
      void connection.closed.then(() => fail(new Error("Cursor connection closed")));
      processHandle.child.on("error", fail);
      processHandle.child.on("exit", (code) => fail(new Error(`Cursor exited ${code}`)));
      processHandle.child.stderr.resume();
      try {
        const initialized = await connection.agent.request("initialize", {
          protocolVersion: 1,
          clientInfo: { name: "agentis", version: "2.0.0" },
          clientCapabilities: {},
        });
        if (initialized.protocolVersion !== 1) throw new Error("unsupported ACP version");
        const caps = initialized.agentCapabilities;
        update(input, (state) => ({
          ...state,
          capabilities: (
            [
              ["session-loading", caps?.loadSession],
              ["mcp-http", caps?.mcpCapabilities?.http],
              ["mcp-sse", caps?.mcpCapabilities?.sse],
              ["images", caps?.promptCapabilities?.image],
              ["audio", caps?.promptCapabilities?.audio],
              ["embedded-context", caps?.promptCapabilities?.embeddedContext],
            ] as const
          ).map(([name, available]) => ({
            name,
            operation:
              name === "session-loading" && available
                ? ("available" as const)
                : ("unavailable" as const),
            state: available ? ("negotiated" as const) : ("unavailable" as const),
            reason: available ? ("advertised" as const) : ("not-advertised" as const),
          })),
        }));
        update(input, (state) => ({
          ...state,
          capabilities: [
            ...state.capabilities,
            ...documentedCapabilities(["permissions", "questions", "plans", "usage"]),
          ],
        }));
        if (input.loadSession) {
          if (!run.providerSessionId || !caps?.loadSession)
            throw new Error("unsupported session loading");
          session.sessionId = run.providerSessionId;
          await connection.agent.request("session/load", {
            sessionId: run.providerSessionId,
            cwd:
              input.executionBoundary === "docker-desktop-run-container"
                ? "/workspace"
                : input.workspace,
            mcpServers: [],
          });
          update(input, (state) => ({ ...state, loadHistory: [normalizedHistory(replay)] }));
          if (normalizedHistory(replay) !== normalizedHistory(run.providerState.history))
            throw new Error("session history mismatch");
          update(input, (state) => ({ ...state, loadStatus: "succeeded", failureDetail: null }));
          interruptCursor(input.runId);
          return;
        }
        const created = await connection.agent.request("session/new", {
          cwd:
            input.executionBoundary === "docker-desktop-run-container"
              ? "/workspace"
              : input.workspace,
          mcpServers: [],
        });
        session.sessionId = created.sessionId;
        const modelState = Schema.decodeUnknownSync(
          Schema.Struct({
            models: Schema.Struct({
              availableModels: Schema.Array(Schema.Struct({ modelId: Schema.String })),
            }),
          }),
        )(created);
        if (!modelState.models.availableModels.some((model) => model.modelId === run.frozen.model))
          throw new Error("unsupported frozen Cursor model");
        await connection.agent.request("session/set_model", {
          sessionId: created.sessionId,
          modelId: run.frozen.model,
        });
        await connection.agent.request("session/set_mode", {
          sessionId: created.sessionId,
          modeId: run.frozen.mode,
        });
        if (
          !engineCall(input, (engine) =>
            engine.markRunning(input.runId, created.sessionId, Date.now()),
          )
        ) {
          interruptCursor(input.runId);
          return;
        }
        clearTimeout(session.timer);
        update(input, (state) => ({
          ...state,
          history: [
            ...state.history,
            JSON.stringify({
              sessionUpdate: "user_message_chunk",
              content: { type: "text", text: input.brief },
            }),
          ],
        }));
        void connection.agent
          .request("session/prompt", {
            sessionId: created.sessionId,
            prompt: [{ type: "text", text: input.brief }],
          })
          .then((result) => {
            if (sessions.get(input.runId) !== session) return;
            if (typeof result.stopReason !== "string")
              throw new Error("malformed response: stopReason");
            if (
              /^Error: RetriableError: \[internal\] HTTPS proxy CONNECT failed: \d{3}(?: [^\r\n]+)?$/.test(
                text.trim(),
              )
            )
              throw new Error("provider proxy connection failed");
            if (result.stopReason !== "end_turn")
              throw new Error(`Cursor turn ${result.stopReason}`);
            const path = join(input.workspace, "hello.md");
            if (!text.trim())
              throw new Error("malformed response: completed turn has no draft text");
            const body = text;
            engineCall(input, (engine) => {
              if (!engine.isActive(input.runId)) return;
              writeFileSync(path, body, { mode: 0o600 });
              engine.complete({
                runId: input.runId,
                taskId: input.taskId,
                author: run.frozen.bot,
                source: "cursor",
                mediaType: "text/markdown",
                sha256: createHash("sha256").update(body).digest("hex"),
                byteSize: Buffer.byteLength(body),
                path,
                nowMs: Date.now(),
              });
            });
            interruptCursor(input.runId);
          })
          .catch(fail);
      } catch (error) {
        fail(error);
      }
    },
    catch: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      update(input, (state) => ({
        ...state,
        failure: classifyFailure(message),
        ...(input.loadSession ? { loadStatus: "failed" as const } : {}),
      }));
      engineCall(input, (engine) => engine.fail(input.runId, input.taskId, message, Date.now()));
      interruptCursor(input.runId);
      return error instanceof Error ? error : new Error(message);
    },
  });
