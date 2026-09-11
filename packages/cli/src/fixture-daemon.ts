import { mkdirSync, chmodSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { Effect } from "effect";
import { startServer } from "./http.js";
import { saveProfile } from "./profile.js";

const usage = "fixture-daemon --endpoint URL --data-root DIR";

const requiredString = (value: string | boolean | undefined, name: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${usage}: ${name} is required`);
  }
  return value;
};

const values = parseArgs({
  args: process.argv.slice(2),
  options: {
    endpoint: { type: "string" },
    "data-root": { type: "string" },
  },
  allowPositionals: true,
});

if (values.positionals.length > 0) {
  throw new Error(usage);
}

const endpoint = new URL(requiredString(values.values.endpoint, "--endpoint"));
if (endpoint.hostname !== "127.0.0.1" || !endpoint.port) {
  throw new Error("fixture endpoint must be an explicit 127.0.0.1 URL");
}

const dataRoot = resolve(requiredString(values.values["data-root"], "--data-root"));
const workspace = join(dataRoot, "scratch");
mkdirSync(workspace, { recursive: true, mode: 0o700 });

const server = await Effect.runPromise(
  startServer({
    endpoint,
    dataRoot,
    workspace,
    provider: "fake",
    executionBoundary: "docker-fixture-container",
  }),
);

saveProfile({
  name: "verify",
  endpoint: endpoint.toString(),
  dataRoot,
  provider: "fake",
  executionBoundary: "docker-fixture-container",
});
writeFileSync(join(dataRoot, "endpoint"), `${endpoint.toString()}\n`, { mode: 0o600 });
writeFileSync(join(dataRoot, "pid"), `${process.pid}\n`, { mode: 0o600 });
chmodSync(join(dataRoot, "endpoint"), 0o600);
chmodSync(join(dataRoot, "pid"), 0o600);

process.stdout.write(
  `${JSON.stringify({
    endpoint: endpoint.toString(),
    pid: process.pid,
    dataRoot,
    log: join(dataRoot, "daemon.log"),
    workspace,
  })}\n`,
);

let stopping = false;
let resolveStopped: (() => void) | undefined;
const stopped = new Promise<void>((resolvePromise) => {
  resolveStopped = resolvePromise;
});
const stop = () => {
  if (stopping) return;
  stopping = true;
  void server.close()
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    })
    .finally(() => {
      process.stdin.pause();
      resolveStopped?.();
    });
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
process.stdin.once("end", stop);
process.stdin.once("error", stop);
process.stdin.resume();
await stopped;
