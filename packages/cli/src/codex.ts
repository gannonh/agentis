import { classifyFailure, documentedCapabilities } from "./provider-contract.js";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect, Schema } from "effect";
import {
  readCodexVersionInContainer,
  removeRunContainer,
  spawnCodexAppServerInContainer,
  type RunContainerProcess,
} from "./container.js";
import { mutateForEngine } from "./store.js";
import type { DriveInput } from "./engine.js";
import { CODEX_CLI_PIN } from "./versions.js";
import type { ExecutionBoundary, RunId } from "./schema.js";

class CodexError extends Error {
  readonly _tag = "CodexError";
}

type Json = Record<string, unknown>;

type Session = {
  readonly runId: RunId;
  readonly child: ChildProcessWithoutNullStreams;
  readonly stop: () => void;
  readonly cancelPending: () => void;
  readonly request: (id: string | number, method: string, params: Json) => Promise<Json>;
  readonly send: (message: Json) => void;
  pendingServerRequest: Json | null;
  threadId: string | null;
  lastText: string;
  readonly completedPlanIds: Set<string>;
};

const sessions = new Map<string, Session>();

const asJson = (value: unknown): Json =>
  value && typeof value === "object" ? (value as Json) : {};

const rpcTimeoutMs = () => Number(process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS ?? "180000");

const spawnAppServer = (
  runId: RunId,
  cwd: string,
  dataRoot: string,
  executionBoundary: typeof ExecutionBoundary.Type,
  loadSession = false,
): RunContainerProcess => {
  const stub = process.env.AGENTIS_CODEX_STUB;
  if (executionBoundary === "docker-desktop-run-container") {
    return spawnCodexAppServerInContainer({
      runId,
      workspace: cwd,
      dataRoot,
      loadSession,
      ...(stub ? { stub } : {}),
    });
  }
  if (stub) {
    const child = spawn(process.execPath, [stub], {
      cwd,
      env: { PATH: process.env.PATH ?? "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      child,
      stop: () => {
        if (child.exitCode === null && !child.killed) {
          child.kill("SIGTERM");
        }
      },
    };
  }
  throw new CodexError(
    "unsupported boundary: live Codex requires Docker; host execution is disabled",
  );
};

const readVersion = async (executionBoundary: typeof ExecutionBoundary.Type) => {
  if (process.env.AGENTIS_CODEX_STUB) {
    return;
  }
  if (executionBoundary === "docker-desktop-run-container") {
    await readCodexVersionInContainer(CODEX_CLI_PIN);
    return;
  }
  throw new CodexError(
    "unsupported boundary: live Codex requires Docker; host execution is disabled",
  );
};

const failRun = (input: DriveInput, error: string) => {
  const engine = mutateForEngine(input.store.path);
  engine.providerState(input.runId, (state) => ({
    ...state,
    failure: classifyFailure(error),
    ...(input.loadSession ? { loadStatus: "failed" as const } : {}),
    pendingPrompt: null,
  }));
  engine.fail(input.runId, input.taskId, error, Date.now());
  engine.close();
};

// stop() removes the Run container and throws when Docker is unreachable or the container
// survives; callers run inside child/timer callbacks where an escaped throw kills the daemon.
const dropSession = (runId: RunId, expected?: Session) => {
  const session = sessions.get(runId);
  if (expected && session !== expected) return false;
  sessions.delete(runId);
  session?.cancelPending();
  try {
    session?.stop();
  } catch (error) {
    process.stderr.write(
      `run ${runId} cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
  return session !== undefined;
};

export const spawnCodex = (input: DriveInput): Effect.Effect<void, Error> => {
  let ownedSession: Session | undefined;
  return Effect.tryPromise({
    try: async () => {
      if (input.loadSession) {
        const engine = mutateForEngine(input.store.path);
        const claimed = engine.isLoading(input.runId);
        if (claimed)
          engine.providerState(input.runId, (state) => ({
            ...state,
            failure: null,
            failureDetail: null,
          }));
        engine.close();
        if (!claimed) return;
      }
      await readVersion(input.executionBoundary);
      const guard = mutateForEngine(input.store.path);
      const permitted = input.loadSession
        ? guard.isLoading(input.runId)
        : guard.isActive(input.runId);
      guard.close();
      if (!permitted) return;
      mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
      const providerProcess = spawnAppServer(
        input.runId,
        input.workspace,
        dirname(input.store.path),
        input.executionBoundary,
        input.loadSession,
      );
      const { child } = providerProcess;
      const pending = new Map<
        string | number,
        { complete: (value: Json) => void; cancel: () => void }
      >();
      const send = (message: Json) => {
        child.stdin.write(`${JSON.stringify(message)}\n`);
      };
      const session: Session = {
        runId: input.runId,
        child,
        stop: providerProcess.stop,
        cancelPending: () => {
          for (const request of pending.values()) request.cancel();
          pending.clear();
        },
        send,
        pendingServerRequest: null,
        threadId: null,
        lastText: "",
        completedPlanIds: new Set(),
        request: (id, method, params) =>
          new Promise<Json>((resolve, reject) => {
            if (sessions.get(input.runId) !== session) {
              reject(new CodexError("session closed"));
              return;
            }
            const timer = setTimeout(() => {
              pending.delete(id);
              reject(new CodexError(`${method} timed out`));
            }, rpcTimeoutMs());
            pending.set(id, {
              complete: (value) => {
                clearTimeout(timer);
                if (value.error) {
                  reject(new CodexError(`${method} failed: ${JSON.stringify(value.error)}`));
                  return;
                }
                resolve(value);
              },
              cancel: () => {
                clearTimeout(timer);
                reject(new CodexError("session closed"));
              },
            });
            send({ id, method, params });
          }),
      };
      ownedSession = session;
      createInterface({ input: child.stdout }).on("line", (line) => {
        if (sessions.get(input.runId) !== session) return;
        if (!line.trim()) return;
        let value: Json;
        try {
          value = Schema.decodeUnknownSync(
            Schema.Record({ key: Schema.String, value: Schema.Unknown }),
          )(JSON.parse(line));
        } catch {
          failRun(input, "malformed Codex JSON response");
          dropSession(input.runId);
          return;
        }
        const id = value.id;
        if (id !== undefined && pending.has(id as string | number)) {
          pending.get(id as string | number)?.complete(value);
          pending.delete(id as string | number);
          return;
        }
        void handleNotice(session, input, value).catch((error: unknown) => {
          if (sessions.get(input.runId) !== session) return;
          failRun(input, error instanceof Error ? error.message : String(error));
          dropSession(input.runId);
        });
      });
      child.stderr.on("data", (chunk: Buffer) => {
        writeFileSync(join(input.workspace, "codex.stderr.log"), chunk, { flag: "a" });
      });
      child.on("error", (error) => {
        if (sessions.get(input.runId) !== session) return;
        failRun(input, error.message);
        dropSession(input.runId);
      });
      child.on("exit", (code) => {
        if (sessions.get(input.runId) !== session) {
          return;
        }
        failRun(
          input,
          code === 77 ? "Codex provider credentials unavailable" : `codex exited ${code}`,
        );
        dropSession(input.runId);
      });
      sessions.set(input.runId, session);
      await session.request(1, "initialize", {
        clientInfo: { name: "agentis", version: "2.0.0" },
        capabilities: { experimentalApi: true },
      });
      send({ method: "initialized", params: {} });
      if (!process.env.AGENTIS_CODEX_STUB) {
        const account = await session.request("account", "account/read", { refreshToken: false });
        const accountType = asJson(asJson(account.result).account).type;
        if (accountType !== "chatgpt") {
          throw new CodexError("Codex auth mode is not ChatGPT login");
        }
      }
      const stored = (await Effect.runPromise(input.store.snapshot())).runs.find(
        (run) => run.id === input.runId,
      );
      if (input.loadSession) {
        if (!stored?.providerSessionId)
          throw new CodexError("unsupported session loading: missing provider session");
        await session.request("resume", "thread/resume", {
          threadId: stored.providerSessionId,
          excludeTurns: true,
          approvalPolicy: "untrusted",
          approvalsReviewer: "user",
          sandbox: "read-only",
        });
        const history: string[] = [];
        let cursor: string | null = null;
        let page = 0;
        const seen = new Set<string>();
        do {
          const response = await session.request(`history-${page++}`, "thread/turns/list", {
            threadId: stored.providerSessionId,
            limit: 100,
            ...(cursor ? { cursor } : {}),
          });
          const result = asJson(response.result);
          if (!Array.isArray(result.data)) throw new CodexError("malformed paginated history");
          history.push(...result.data.map((item) => JSON.stringify(item)));
          cursor = typeof result.nextCursor === "string" ? result.nextCursor : null;
          if (cursor && seen.has(cursor)) throw new CodexError("malformed repeated history cursor");
          if (cursor) seen.add(cursor);
        } while (cursor);
        const engine = mutateForEngine(input.store.path);
        engine.providerState(input.runId, (state) => ({
          ...state,
          history,
          failure: null,
          failureDetail: null,
          loadStatus: state.loadStatus === "loading" ? "succeeded" : state.loadStatus,
        }));
        engine.close();
        dropSession(input.runId);
        return;
      }
      const thread = await session.request(2, "thread/start", {
        cwd:
          input.executionBoundary === "docker-desktop-run-container"
            ? "/workspace"
            : input.workspace,
        model: stored?.frozen.model ?? "gpt-5.6-sol",
        approvalPolicy: "untrusted",
        approvalsReviewer: "user",
        sandbox: "read-only",
      });
      const result = asJson(thread.result);
      const nested = asJson(result.thread);
      const threadId =
        typeof result.id === "string"
          ? result.id
          : typeof nested.id === "string"
            ? nested.id
            : null;
      if (!threadId) {
        throw new CodexError("thread/start returned no id");
      }
      session.threadId = threadId;
      const engine = mutateForEngine(input.store.path);
      if (!engine.markRunning(input.runId, threadId, input.nowMs)) {
        engine.close();
        dropSession(input.runId);
        return;
      }
      engine.providerState(input.runId, (state) => ({
        ...state,
        capabilities: documentedCapabilities([
          "session-loading",
          "permissions",
          "questions",
          "plans",
          "mcp-http",
          "mcp-sse",
          "images",
          "usage",
        ]).map((capability) =>
          capability.name === "plans"
            ? {
                ...capability,
                operation: "unavailable" as const,
                reason: "native-plan-output-without-blocking-approval" as const,
              }
            : capability,
        ),
      }));
      engine.close();
      await session.request(10, "turn/start", {
        threadId,
        effort: stored?.frozen.effort ?? "medium",
        input: [{ type: "text", text: input.brief }],
        ...((await Effect.runPromise(input.store.snapshot())).runs.find(
          (run) => run.id === input.runId,
        )?.frozen.mode === "plan"
          ? {
              collaborationMode: {
                mode: "plan",
                settings: {
                  model: "gpt-5.6-sol",
                  reasoning_effort: "medium",
                  developer_instructions: null,
                },
              },
            }
          : {}),
      });
    },
    catch: (error) => {
      if (ownedSession ? sessions.get(input.runId) === ownedSession : !sessions.has(input.runId)) {
        failRun(input, error instanceof Error ? error.message : String(error));
        dropSession(input.runId, ownedSession);
      }
      return error instanceof Error ? error : new Error(String(error));
    },
  });
};

const handleNotice = async (session: Session, input: DriveInput, value: Json) => {
  if (sessions.get(input.runId) !== session) return;
  const method = typeof value.method === "string" ? value.method : "";
  const params = asJson(value.params);
  if (
    input.loadSession &&
    (method === "item/commandExecution/requestApproval" || method === "item/tool/requestUserInput")
  ) {
    session.send({
      id: value.id,
      error: { code: -32601, message: "tools and input are unavailable during history loading" },
    });
    return;
  }
  if (
    session.pendingServerRequest &&
    (method === "item/commandExecution/requestApproval" || method === "item/tool/requestUserInput")
  ) {
    session.send({
      id: value.id,
      error: { code: -32600, message: "another provider request is awaiting an owner response" },
    });
    return;
  }
  if (method === "item/commandExecution/requestApproval") {
    session.pendingServerRequest = value;
    const command = typeof params.command === "string" ? params.command : "command";
    const engine = mutateForEngine(input.store.path);
    const budget = engine.bumpAction(input.runId, input.taskId);
    if (budget.exhausted) {
      engine.fail(input.runId, input.taskId, "action budget exhausted", Date.now());
      engine.close();
      dropSession(input.runId);
      return;
    }
    engine.providerState(input.runId, (state) => ({
      ...state,
      pendingPrompt: JSON.stringify(params),
    }));
    engine.waitApproval({
      runId: input.runId,
      taskId: input.taskId,
      tool: "codex-command",
      argumentDigest: createHash("sha256").update(command).digest("hex"),
      nowMs: Date.now(),
    });
    engine.close();
    return;
  }
  if (method === "item/tool/requestUserInput") {
    session.pendingServerRequest = value;
    const engine = mutateForEngine(input.store.path);
    engine.waitInput(input.runId, JSON.stringify(params), Date.now());
    engine.providerState(input.runId, (state) => ({
      ...state,
      pendingPrompt: JSON.stringify(params),
    }));
    engine.close();
    return;
  }
  const item = "item" in value ? asJson(value.item) : asJson(params.item);
  if (
    method === "item/completed" &&
    item.type === "agentMessage" &&
    typeof item.text === "string"
  ) {
    session.lastText = item.text;
  }
  if (method === "item/completed" && item.type === "plan") {
    const plan = Schema.decodeUnknownSync(
      Schema.Struct({ type: Schema.Literal("plan"), id: Schema.String, text: Schema.String }),
    )(item);
    if (session.completedPlanIds.has(plan.id)) return;
    session.completedPlanIds.add(plan.id);
    session.lastText = plan.text;
    const engine = mutateForEngine(input.store.path);
    try {
      engine.providerState(input.runId, (state) => ({
        ...state,
        history: [...state.history, JSON.stringify(plan)],
      }));
    } finally {
      engine.close();
    }
  }
  const turn = "turn" in value ? asJson(value.turn) : asJson(params.turn);
  if (method === "turn/completed" && turn.status === "interrupted") {
    const engine = mutateForEngine(input.store.path);
    engine.fail(input.runId, input.taskId, "interrupted", Date.now());
    engine.close();
    dropSession(input.runId);
    return;
  }
  if (method === "turn/completed" && turn.status === "failed") {
    const error =
      typeof turn.error === "string"
        ? turn.error
        : typeof params.error === "string"
          ? params.error
          : "turn failed";
    const engine = mutateForEngine(input.store.path);
    engine.fail(input.runId, input.taskId, error, Date.now());
    engine.close();
    dropSession(input.runId);
    return;
  }
  if (method === "turn/completed") {
    if (!session.lastText.trim())
      throw new CodexError("malformed response: completed turn has no draft text");
    finish(session, input, session.lastText);
    return;
  }
  if (method === "turn/interrupted") {
    const engine = mutateForEngine(input.store.path);
    engine.fail(input.runId, input.taskId, "interrupted", Date.now());
    engine.close();
    dropSession(input.runId);
  }
};

const finish = (session: Session, input: DriveInput, text: string) => {
  const path = join(input.workspace, "hello.md");
  const body = text;
  const engine = mutateForEngine(input.store.path);
  if (!engine.isActive(input.runId)) {
    engine.close();
    dropSession(input.runId);
    return;
  }
  writeFileSync(path, body, { mode: 0o600 });
  engine.complete({
    runId: input.runId,
    taskId: input.taskId,
    author: "mara",
    source: "codex",
    mediaType: "text/markdown",
    sha256: createHash("sha256").update(body).digest("hex"),
    byteSize: Buffer.byteLength(body),
    path,
    nowMs: Date.now(),
  });
  engine.close();
  dropSession(input.runId);
};

export const resolveCodexApproval = (runId: RunId, decision: "allowed" | "denied") => {
  const session = sessions.get(runId);
  if (!session?.pendingServerRequest) {
    return;
  }
  const id = session.pendingServerRequest.id;
  session.send({
    id,
    result: { decision: decision === "allowed" ? "accept" : "cancel" },
  });
  session.pendingServerRequest = null;
  if (decision === "denied") {
    dropSession(runId);
  }
};

export const answerCodexInput = (runId: RunId, answers: Record<string, string>) => {
  const session = sessions.get(runId);
  if (!session?.pendingServerRequest) {
    return;
  }
  const id = session.pendingServerRequest.id;
  const mapped: Record<string, { answers: string[] }> = {};
  for (const [key, value] of Object.entries(answers)) {
    mapped[key] = { answers: [value] };
  }
  session.send({ id, result: { answers: mapped } });
  session.pendingServerRequest = null;
};

export const interruptCodex = (runId: RunId, executionBoundary?: typeof ExecutionBoundary.Type) => {
  if (!dropSession(runId) && executionBoundary === "docker-desktop-run-container") {
    removeRunContainer(runId);
  }
};

export const interruptAllCodex = () => {
  const ids = Array.from(sessions.keys());
  for (const runId of ids) {
    interruptCodex(runId as RunId);
  }
};
