import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
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
  readonly request: (id: string | number, method: string, params: Json) => Promise<Json>;
  readonly send: (message: Json) => void;
  pendingServerRequest: Json | null;
  threadId: string | null;
  lastText: string;
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
): RunContainerProcess => {
  const stub = process.env.AGENTIS_CODEX_STUB;
  if (executionBoundary === "docker-desktop-run-container") {
    return spawnCodexAppServerInContainer({
      runId,
      workspace: cwd,
      dataRoot,
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
  const child = spawn("codex", ["--disable", "hooks", "app-server", "--listen", "stdio://"], {
    cwd,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: join(cwd, ".codex-home"),
      NO_OPEN_BROWSER: "1",
    },
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
};

const readVersion = async (executionBoundary: typeof ExecutionBoundary.Type) => {
  if (process.env.AGENTIS_CODEX_STUB) {
    return;
  }
  if (executionBoundary === "docker-desktop-run-container") {
    await readCodexVersionInContainer(CODEX_CLI_PIN);
    return;
  }
  const child = spawn("codex", ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
  const text = await new Promise<string>((resolve, reject) => {
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new CodexError(`codex --version exited ${code}`));
    });
  });
  if (!text.includes(CODEX_CLI_PIN)) {
    throw new CodexError(`expected Codex ${CODEX_CLI_PIN}, found ${text}`);
  }
};

const failRun = (input: DriveInput, error: string) => {
  const engine = mutateForEngine(input.store.path);
  engine.fail(input.runId, input.taskId, error, Date.now());
  engine.close();
};

// stop() removes the Run container and throws when Docker is unreachable or the container
// survives; callers run inside child/timer callbacks where an escaped throw kills the daemon.
const dropSession = (runId: RunId) => {
  const session = sessions.get(runId);
  sessions.delete(runId);
  try {
    session?.stop();
  } catch (error) {
    process.stderr.write(
      `run ${runId} cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
  return session !== undefined;
};

export const spawnCodex = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      await readVersion(input.executionBoundary);
      mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
      const providerProcess = spawnAppServer(
        input.runId,
        input.workspace,
        dirname(input.store.path),
        input.executionBoundary,
      );
      const { child } = providerProcess;
      const pending = new Map<string | number, (value: Json) => void>();
      const send = (message: Json) => {
        child.stdin.write(`${JSON.stringify(message)}\n`);
      };
      const session: Session = {
        runId: input.runId,
        child,
        stop: providerProcess.stop,
        send,
        pendingServerRequest: null,
        threadId: null,
        lastText: "",
        request: (id, method, params) =>
          new Promise<Json>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new CodexError(`${method} timed out`)),
              rpcTimeoutMs(),
            );
            pending.set(id, (value) => {
              clearTimeout(timer);
              if (value.error) {
                reject(new CodexError(`${method} failed: ${JSON.stringify(value.error)}`));
                return;
              }
              resolve(value);
            });
            send({ id, method, params });
          }),
      };
      createInterface({ input: child.stdout }).on("line", (line) => {
        if (!line.trim()) return;
        let value: Json;
        try {
          value = JSON.parse(line) as Json;
        } catch {
          return;
        }
        const id = value.id;
        if (id !== undefined && pending.has(id as string | number)) {
          pending.get(id as string | number)?.(value);
          pending.delete(id as string | number);
          return;
        }
        void handleNotice(session, input, value).catch((error: unknown) => {
          failRun(input, error instanceof Error ? error.message : String(error));
          dropSession(input.runId);
        });
      });
      child.stderr.on("data", (chunk: Buffer) => {
        writeFileSync(join(input.workspace, "codex.stderr.log"), chunk, { flag: "a" });
      });
      child.on("error", (error) => {
        failRun(input, error.message);
        dropSession(input.runId);
      });
      child.on("exit", (code) => {
        if (!sessions.has(input.runId)) {
          return;
        }
        failRun(input, `codex exited ${code}`);
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
      const thread = await session.request(2, "thread/start", {
        cwd:
          input.executionBoundary === "docker-desktop-run-container"
            ? "/workspace"
            : input.workspace,
        model: "gpt-5.6-sol",
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
      engine.markRunning(input.runId, threadId, input.nowMs);
      engine.close();
      await session.request(10, "turn/start", {
        threadId,
        input: [{ type: "text", text: input.brief }],
        ...(input.brief.includes("request_user_input")
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
      failRun(input, error instanceof Error ? error.message : String(error));
      dropSession(input.runId);
      return error instanceof Error ? error : new Error(String(error));
    },
  });

const handleNotice = async (session: Session, input: DriveInput, value: Json) => {
  const method = typeof value.method === "string" ? value.method : "";
  const params = asJson(value.params);
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
    engine.waitInput(input.runId, "codex-user-input", Date.now());
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
    finish(session, input, session.lastText || "completed");
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
  const body = `# ${input.brief}\n\n${text}\nproviderSession=${session.threadId ?? ""}\n`;
  writeFileSync(path, body, { mode: 0o600 });
  const engine = mutateForEngine(input.store.path);
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
