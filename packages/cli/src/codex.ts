import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { mutateForEngine } from "./store.js";
import type { DriveInput } from "./engine.js";
import { CODEX_CLI_PIN } from "./versions.js";

class CodexError extends Error {
  readonly _tag = "CodexError";
}

type Json = Record<string, unknown>;

const readVersion = async () => {
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

const send = (child: ChildProcessWithoutNullStreams, message: Json) => {
  child.stdin.write(`${JSON.stringify(message)}\n`);
};

const listen = (child: ChildProcessWithoutNullStreams, onLine: (value: Json) => void) => {
  const reader = createInterface({ input: child.stdout });
  reader.on("line", (line) => {
    if (!line.trim()) return;
    onLine(JSON.parse(line) as Json);
  });
  return reader;
};

export const spawnCodex = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      await readVersion();
      mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
      const child = spawn("codex", ["--disable", "hooks", "app-server", "--listen", "stdio://"], {
        cwd: input.workspace,
        env: {
          PATH: process.env.PATH ?? "",
          HOME: homedir(),
          NO_OPEN_BROWSER: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      const pending = new Map<string | number, (value: Json) => void>();
      const events: Json[] = [];
      listen(child, (value) => {
        events.push(value);
        const id = value.id;
        if (id !== undefined && pending.has(id as string | number)) {
          pending.get(id as string | number)?.(value);
          pending.delete(id as string | number);
        }
      });
      const request = (id: string | number, method: string, params: Json) =>
        new Promise<Json>((resolve, reject) => {
          const timer = setTimeout(() => reject(new CodexError(`${method} timed out`)), 120_000);
          pending.set(id, (value) => {
            clearTimeout(timer);
            resolve(value);
          });
          send(child, { id, method, params });
        });
      await request(1, "initialize", {
        clientInfo: { name: "agentis", version: "2.0.0" },
        capabilities: { experimentalApi: true },
      });
      send(child, { method: "initialized", params: {} });
      const account = await request("account", "account/read", { refreshToken: false });
      const accountType = (account.result as Json | undefined)?.account as Json | undefined;
      if (accountType?.type !== "chatgpt") {
        throw new CodexError("Codex auth mode is not ChatGPT login");
      }
      const thread = await request(2, "thread/start", {
        cwd: input.workspace,
        model: "gpt-5.6-sol",
        approvalPolicy: "untrusted",
        approvalsReviewer: "user",
        sandbox: "read-only",
      });
      const threadId = (thread.result as Json | undefined)?.thread
        ? ((thread.result as Json).thread as Json).id
        : (thread.result as Json | undefined)?.id;
      if (typeof threadId !== "string") {
        throw new CodexError("thread/start returned no id");
      }
      const engine = mutateForEngine(input.store.path);
      engine.markRunning(input.runId, threadId, input.nowMs);
      const turn = await request(10, "turn/start", {
        threadId,
        input: [{ type: "text", text: input.brief }],
      });
      void turn;
      const path = join(input.workspace, "hello.md");
      const body = `# ${input.brief}\nproviderSession=${threadId}\n`;
      writeFileSync(path, body);
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
      child.kill("SIGTERM");
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });
