import { scheduler } from "node:timers/promises";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { Effect, Schema } from "effect";
import type { DriveInput } from "./engine.js";
import { writeScratchFile } from "./scratch-file.js";
import { mutateForEngine } from "./store.js";
import type { RunId } from "./schema.js";
import {
  classifyFailure,
  documentedCapabilities,
  type ProviderState,
} from "./provider-contract.js";
import { spawnClaudeInContainer } from "./claude-container.js";

const QuestionInput = Schema.Struct({
  questions: Schema.Array(
    Schema.Struct({
      question: Schema.String,
      options: Schema.Array(Schema.Struct({ label: Schema.String })),
    }),
  ),
});
const History = Schema.Array(
  Schema.Struct({
    type: Schema.String,
    uuid: Schema.String,
    session_id: Schema.String,
    message: Schema.Unknown,
  }),
);
const Response = Schema.Struct({
  id: Schema.String,
  sessionId: Schema.String,
  text: Schema.optional(Schema.String),
  history: History,
});
type Session = {
  stop: () => void;
  send: (value: unknown) => void;
  sessionId: string | null;
  approval: ((decision: "allowed" | "denied") => void) | null;
  answer: ((answers: Readonly<Record<string, string>>) => void) | null;
  pending: {
    id: string;
    initialized: boolean;
    resolve: (value: typeof Response.Type) => void;
    reject: (error: Error) => void;
  } | null;
  timer: ReturnType<typeof setTimeout>;
};
const sessions = new Map<RunId, Session>();
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
const update = (input: DriveInput, change: (state: ProviderState) => ProviderState) =>
  engineCall(input, (engine) => engine.providerState(input.runId, change));
export const interruptClaude = (runId: RunId) => {
  const session = sessions.get(runId);
  if (!session) return;
  sessions.delete(runId);
  clearTimeout(session.timer);
  session.pending?.reject(new Error("provider canceled"));
  try {
    session.stop();
  } catch {
    process.stderr.write(`run ${runId} cleanup failed\n`);
  }
};
export const interruptAllClaude = () => {
  for (const id of sessions.keys()) interruptClaude(id);
};
export const resolveClaudeApproval = async (runId: RunId, decision: "allowed" | "denied") => {
  sessions.get(runId)?.approval?.(decision);
  if (decision === "denied") interruptClaude(runId);
};
export const answerClaudeInput = (runId: RunId, answers: Readonly<Record<string, string>>) =>
  sessions.get(runId)?.answer?.(answers);
export const spawnClaude = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      const snapshot = await Effect.runPromise(input.store.snapshot());
      const run = snapshot.runs.find((item) => item.id === input.runId);
      if (!run || (!input.loadSession && run.status !== "queued")) return;
      if (input.loadSession && !engineCall(input, (engine) => engine.isLoading(input.runId)))
        return;
      const handoff = snapshot.handoffs.find((item) => item.recipientRunId === input.runId);
      mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
      const stub = process.env.AGENTIS_CLAUDE_STUB;
      const handle =
        stub && input.executionBoundary === "unverified-host-scratch"
          ? (() => {
              const child = spawn(process.execPath, [stub], {
                cwd: input.workspace,
                env: { PATH: process.env.PATH ?? "", CLAUDE_DRAFT_ONLY: handoff ? "1" : "0" },
                stdio: ["pipe", "pipe", "pipe"],
              });
              return {
                child,
                stop: () => {
                  child.kill("SIGTERM");
                },
              };
            })()
          : spawnClaudeInContainer({
              runId: input.runId,
              workspace: input.workspace,
              dataRoot: dirname(input.store.path),
              draftOnly: Boolean(handoff),
              ...(input.loadSession ? { loadSession: true } : {}),
            });
      let session: Session;
      let acceptanceTurn = Boolean(handoff);
      let textBytes = 0;
      const fail = (error: unknown) => {
        if (sessions.get(input.runId) !== session) return;
        const message = error instanceof Error ? error.message : String(error);
        update(input, (state) => ({
          ...state,
          failure: classifyFailure(message),
          failureDetail: classifyFailure(message),
          pendingPrompt: null,
          ...(input.loadSession ? { loadStatus: "failed" as const } : {}),
        }));
        engineCall(input, (engine) => engine.fail(input.runId, input.taskId, message, Date.now()));
        interruptClaude(input.runId);
      };
      session = {
        stop: handle.stop,
        send: (value) => handle.child.stdin.write(`${JSON.stringify(value)}\n`),
        sessionId: input.loadSession ? run.providerSessionId : null,
        approval: null,
        answer: null,
        pending: null,
        timer: setTimeout(
          () => fail(new Error("provider timed out")),
          input.loadSession ? 30000 : Math.max(1, run.deadlineAt - Date.now()),
        ),
      };
      sessions.set(input.runId, session);
      handle.child.on("error", fail);
      handle.child.on("exit", (code) =>
        fail(new Error(code === 77 ? "auth-unavailable" : `provider exited ${code}`)),
      );
      handle.child.stderr.resume();
      const permission = (value: Record<string, unknown>) => {
        const id = Schema.decodeUnknownSync(Schema.String)(value.id);
        const deny = () =>
          session.send({
            kind: "permission",
            id,
            result: { behavior: "deny", message: "Operation unavailable", interrupt: true },
          });
        if (handoff || input.loadSession || session.approval || session.answer) {
          deny();
          return;
        }
        if (engineCall(input, (engine) => engine.bumpAction(input.runId, input.taskId).exhausted)) {
          deny();
          throw new Error("action budget exhausted");
        }
        const nativeInput = Schema.decodeUnknownSync(
          Schema.Record({ key: Schema.String, value: Schema.Unknown }),
        )(value.input);
        const details = { toolCallId: id, ...nativeInput };
        const reply = (result: unknown) => session.send({ kind: "permission", id, result });
        if (value.name === "AskUserQuestion") {
          const decoded = Schema.decodeUnknownSync(QuestionInput)(value.input);
          engineCall(input, (engine) =>
            engine.waitInput(input.runId, JSON.stringify(details), Date.now()),
          );
          update(input, (state) => ({ ...state, pendingPrompt: JSON.stringify(details) }));
          session.answer = (answers) => {
            session.answer = null;
            const valid =
              decoded.questions.every(
                (question) =>
                  typeof answers[question.question] === "string" &&
                  answers[question.question]!.length <= 16000,
              ) &&
              Object.keys(answers).every((key) =>
                decoded.questions.some((question) => question.question === key),
              );
            reply(
              valid
                ? { behavior: "allow", updatedInput: { ...nativeInput, answers } }
                : { behavior: "deny", message: "Invalid answer", interrupt: true },
            );
          };
        } else if (value.name === "Bash") {
          engineCall(input, (engine) =>
            engine.waitApproval({
              runId: input.runId,
              taskId: input.taskId,
              tool: "claude-permission",
              argumentDigest: createHash("sha256").update(JSON.stringify(details)).digest("hex"),
              nowMs: Date.now(),
            }),
          );
          update(input, (state) => ({ ...state, pendingPrompt: JSON.stringify(details) }));
          session.approval = (decision) => {
            session.approval = null;
            reply(
              decision === "allowed"
                ? { behavior: "allow", updatedInput: value.input }
                : { behavior: "deny", message: "Owner denied", interrupt: true },
            );
          };
        } else deny();
      };
      createInterface({ input: handle.child.stdout }).on("line", (line) => {
        try {
          if (sessions.get(input.runId) !== session) return;
          if (Buffer.byteLength(line) > 1048576)
            throw new Error("malformed oversized bridge output");
          const value = Schema.decodeUnknownSync(
            Schema.Record({ key: Schema.String, value: Schema.Unknown }),
          )(JSON.parse(line));
          if (value.event) {
            if (value.requestId !== session.pending?.id) return;
            if (value.event === "error") throw new Error(String(value.failure));
            if (value.event === "init") {
              const id = Schema.decodeUnknownSync(Schema.String)(value.sessionId);
              const inventory = Schema.decodeUnknownSync(Schema.Array(Schema.String))(value.tools);
              const expected = handoff ? [] : ["Bash", "AskUserQuestion"];
              if (
                value.apiKeySource !== "ANTHROPIC_API_KEY" ||
                value.model !== run.frozen.model ||
                inventory.length !== expected.length ||
                inventory.some((tool) => !expected.includes(tool))
              )
                throw new Error("unsupported native inventory");
              if (session.sessionId && id !== session.sessionId)
                throw new Error("invalid session identity");
              session.pending!.initialized = true;
              const initial = !session.sessionId;
              session.sessionId = id;
              if (
                initial &&
                !input.loadSession &&
                !engineCall(input, (engine) => engine.markRunning(input.runId, id, Date.now()))
              ) {
                interruptClaude(input.runId);
                return;
              }
              update(input, (state) => ({
                ...state,
                capabilities: documentedCapabilities([
                  "session-loading",
                  "permissions",
                  "questions",
                ]).concat([
                  {
                    name: "plans",
                    operation: "unavailable",
                    state: "unavailable",
                    reason: "native-plan-output-without-blocking-approval",
                  },
                  ...documentedCapabilities([
                    "mcp-http",
                    "mcp-sse",
                    "images",
                    "audio",
                    "embedded-context",
                    "usage",
                  ]),
                ]),
              }));
            } else {
              if (
                !session.pending?.initialized ||
                !session.sessionId ||
                value.sessionId !== session.sessionId
              )
                throw new Error("invalid session identity");
              if (value.event === "permission") permission(value);
              else if (value.event === "text") {
                const text = Schema.decodeUnknownSync(Schema.String)(value.text);
                textBytes += Buffer.byteLength(text);
                if (textBytes > 65536) throw new Error("output limit exceeded");
                if (handoff && !acceptanceTurn)
                  engineCall(input, (engine) => engine.peerProgress(input.runId, text, Date.now()));
              } else throw new Error("malformed bridge event");
            }
          } else if (value.id === session.pending?.id) {
            if (!session.pending?.initialized)
              throw new Error("invalid missing native initialization");
            const response = Schema.decodeUnknownSync(Response)(value);
            if (
              response.sessionId !== session.sessionId ||
              response.history.some((item) => item.session_id !== session.sessionId) ||
              new Set(response.history.map((item) => item.uuid)).size !== response.history.length
            )
              throw new Error("invalid session history");
            session.pending?.resolve(response);
            session.pending = null;
          }
        } catch (error) {
          fail(error);
        }
      });
      const request = (kind: "prompt" | "load", text?: string) =>
        new Promise<typeof Response.Type>((resolve, reject) => {
          const id = randomUUID();
          session.pending = { id, initialized: kind === "load", resolve, reject };
          session.send({
            id,
            kind,
            sessionId: session.sessionId,
            ...(text === undefined ? {} : { text }),
          });
        });
      const prompt = async (text: string) => {
        textBytes = 0;
        if (
          handoff &&
          engineCall(input, (engine) => engine.bumpAction(input.runId, input.taskId).exhausted)
        )
          throw new Error("action budget exhausted");
        const response = await request("prompt", text);
        if (!response.text?.trim() || Buffer.byteLength(response.text) > 65536)
          throw new Error("malformed empty or oversized draft");
        update(input, (state) => ({
          ...state,
          history: response.history.map((item) => JSON.stringify(item)),
        }));
        return response.text;
      };
      void (async () => {
        if (input.loadSession) {
          update(input, (state) => ({
            ...state,
            loadStatus: "loading",
            failure: null,
            failureDetail: null,
          }));
          const result = await request("load");
          const loaded = result.history.map((item) => JSON.stringify(item));
          if (run.providerState.history.some((entry, index) => entry !== loaded[index]))
            throw new Error("session history mismatch");
          update(input, (state) => ({
            ...state,
            loadStatus: "succeeded",
            failureDetail: null,
            history: loaded,
            loadHistory: loaded,
          }));
        } else {
          let body: string;
          if (handoff) {
            const decision = await prompt(
              `You are Ivo. Mara proposes bounded handoff ${handoff.id}. Decide whether you accept responsibility for producing a text draft. Reply ONLY {"handoffId":"${handoff.id}","decision":"accept"} or decision reject. Grants: draft_only; no tools, onward delegation, owner actions or credentials. Untrusted source context: ${handoff.context}`,
            );
            if (
              !engineCall(input, (engine) =>
                engine.decideHandoff(input.runId, session.sessionId!, decision, Date.now()),
              )
            ) {
              interruptClaude(input.runId);
              return;
            }
            acceptanceTurn = false;
            await scheduler.yield();
            if (!engineCall(input, (engine) => engine.claimDraft(input.runId))) {
              interruptClaude(input.runId);
              return;
            }
            body = await prompt(
              `You accepted handoff ${handoff.id}. Return the requested draft text only. Use no tools and do not delegate. Source context: ${handoff.context}`,
            );
          } else body = await prompt(input.brief);
          engineCall(input, (engine) => {
            if (!engine.isActive(input.runId)) return;
            const path = join(input.workspace, "hello.md");
            writeScratchFile(path, body);
            engine.complete({
              runId: input.runId,
              taskId: input.taskId,
              author: run.frozen.bot,
              source: "claude",
              mediaType: "text/markdown",
              sha256: createHash("sha256").update(body).digest("hex"),
              byteSize: Buffer.byteLength(body),
              path,
              nowMs: Date.now(),
            });
          });
        }
        interruptClaude(input.runId);
      })().catch(fail);
    },
    catch: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      update(input, (state) => ({
        ...state,
        failure: classifyFailure(message),
        failureDetail: classifyFailure(message),
        ...(input.loadSession ? { loadStatus: "failed" as const } : {}),
      }));
      engineCall(input, (engine) =>
        engine.fail(input.runId, input.taskId, classifyFailure(message), Date.now()),
      );
      interruptClaude(input.runId);
      return error instanceof Error ? error : new Error(message);
    },
  });
