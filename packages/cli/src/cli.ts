import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Effect, Schema } from "effect";
import { loadOrCreateOwner } from "./auth.js";
import { assertBoundary } from "./boundary.js";
import { startServer } from "./http.js";
import { newIdempotencyKey } from "./ids.js";
import { loadProfile, saveProfile } from "./profile.js";
import {
  ApprovalId,
  ExecutionBoundary,
  FixtureKind,
  ProviderKind,
  RunId,
  type Command,
} from "./schema.js";
import { DEFAULT_DATA_ROOT_SEGMENTS } from "./versions.js";
import { launchVerify } from "./verify.js";

const defaultDataRoot = () => join(homedir(), ...DEFAULT_DATA_ROOT_SEGMENTS);

const usage = `Usage:
  agentis serve --endpoint URL [--data-root DIR] [--profile NAME] [--provider fake|codex] [--execution-boundary docker-desktop-run-container|unverified-host-scratch]
  agentis doctor --endpoint URL | --profile NAME [--data-root DIR]
  agentis task submit --endpoint URL --brief TEXT [--fixture smoke|allow|deny|input|cancel]
  agentis approval allow|deny --endpoint URL --approval ID
  agentis input answer --endpoint URL --run ID --answer KEY=VALUE
  agentis run cancel --endpoint URL --run ID
  agentis stop-all --endpoint URL
  agentis verify launch
`;

const requireControl = (values: Record<string, string | boolean | undefined>, dataRoot: string) => {
  const endpoint = values.endpoint;
  const profile = values.profile;
  if (typeof endpoint === "string" && endpoint.length > 0) {
    return { endpoint: new URL(endpoint), dataRoot };
  }
  if (typeof profile === "string" && profile.length > 0) {
    const saved = loadProfile(dataRoot, profile);
    return { endpoint: new URL(saved.endpoint), dataRoot: saved.dataRoot };
  }
  throw new Error("control requires --endpoint or --profile; no port is guessed");
};

const commandFetch = async (endpoint: URL, dataRoot: string, command: Command) => {
  const owner = await Effect.runPromise(loadOrCreateOwner(dataRoot));
  const response = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${owner.token}`,
    },
    body: JSON.stringify({ idempotencyKey: newIdempotencyKey(), command }),
  });
  const body = await response.text();
  return { status: response.status, body };
};

export const runCli = async (argv: string[]): Promise<number> => {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
    process.stdout.write(usage);
    return 0;
  }
  const verb = argv[0];
  if (verb === "verify" && argv[1] === "launch") {
    const result = await launchVerify();
    process.stdout.write(
      `${JSON.stringify(
        {
          endpoint: result.endpoint,
          pid: result.pid,
          dataRoot: result.dataRoot,
          log: result.log,
          workspace: result.workspace,
        },
        null,
        2,
      )}\n`,
    );
    await new Promise<void>((resolve) => {
      const stop = () => {
        void result.stop().finally(() => resolve());
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
    });
    return 0;
  }
  const { values, positionals } = parseArgs({
    args: argv.slice(1),
    allowPositionals: true,
    options: {
      endpoint: { type: "string" },
      profile: { type: "string" },
      "data-root": { type: "string" },
      provider: { type: "string" },
      "execution-boundary": { type: "string" },
      brief: { type: "string" },
      fixture: { type: "string" },
      approval: { type: "string" },
      run: { type: "string" },
      answer: { type: "string" },
    },
  });
  const dataRoot =
    typeof values["data-root"] === "string" ? values["data-root"] : defaultDataRoot();
  if (verb === "serve") {
    let provider: typeof ProviderKind.Type = "fake";
    let executionBoundary: typeof ExecutionBoundary.Type = "unverified-host-scratch";
    let endpoint: URL;
    if (typeof values.profile === "string") {
      const saved = loadProfile(dataRoot, values.profile);
      endpoint = new URL(saved.endpoint);
      provider = saved.provider;
      executionBoundary = saved.executionBoundary;
    } else if (typeof values.endpoint === "string") {
      endpoint = new URL(values.endpoint);
    } else {
      throw new Error("serve requires --endpoint or --profile; no port is guessed");
    }
    if (typeof values.provider === "string") {
      provider = Schema.decodeUnknownSync(ProviderKind)(values.provider);
    }
    if (typeof values["execution-boundary"] === "string") {
      executionBoundary = Schema.decodeUnknownSync(ExecutionBoundary)(values["execution-boundary"]);
    } else if (typeof values.profile !== "string") {
      executionBoundary =
        provider === "fake" ? "unverified-host-scratch" : "docker-desktop-run-container";
    }
    assertBoundary({ provider, executionBoundary });
    if (!endpoint.port) {
      throw new Error("endpoint must include an explicit port");
    }
    const workspace = join(dataRoot, "scratch");
    mkdirSync(workspace, { recursive: true, mode: 0o700 });
    if (typeof values.profile === "string") {
      saveProfile({
        name: values.profile,
        endpoint: endpoint.toString(),
        dataRoot,
        provider,
        executionBoundary,
      });
    }
    writeFileSync(join(dataRoot, "endpoint"), `${endpoint.toString()}\n`, { mode: 0o600 });
    writeFileSync(join(dataRoot, "pid"), `${process.pid}\n`, { mode: 0o600 });
    const server = await Effect.runPromise(
      startServer({ endpoint, dataRoot, workspace, provider, executionBoundary }),
    );
    process.stdout.write(
      JSON.stringify(
        {
          endpoint: endpoint.toString(),
          pid: process.pid,
          dataRoot,
          log: join(dataRoot, "daemon.log"),
        },
        null,
        2,
      ) + "\n",
    );
    await new Promise<void>((resolve) => {
      const stop = () => {
        void server.close().finally(() => resolve());
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
    });
    return 0;
  }
  const control = requireControl(values, dataRoot);
  if (verb === "doctor") {
    const owner = await Effect.runPromise(loadOrCreateOwner(control.dataRoot));
    const health = await fetch(new URL("/v1/health", control.endpoint));
    const status = await fetch(new URL("/v1/status", control.endpoint), {
      headers: { authorization: `Bearer ${owner.token}` },
    });
    process.stdout.write(
      `${JSON.stringify({ health: await health.json(), status: await status.json() }, null, 2)}\n`,
    );
    return health.ok && status.ok ? 0 : 1;
  }
  if (verb === "task" && positionals[0] === "submit") {
    if (typeof values.brief !== "string") throw new Error("--brief is required");
    const result = await commandFetch(control.endpoint, control.dataRoot, {
      kind: "submit_task",
      brief: values.brief,
      ...(typeof values.fixture === "string"
        ? { fixture: Schema.decodeUnknownSync(FixtureKind)(values.fixture) }
        : {}),
    });
    process.stdout.write(`${result.body}\n`);
    return result.status === 200 ? 0 : 1;
  }
  if (verb === "approval" && (positionals[0] === "allow" || positionals[0] === "deny")) {
    if (typeof values.approval !== "string") throw new Error("--approval is required");
    const result = await commandFetch(control.endpoint, control.dataRoot, {
      kind: "resolve_approval",
      approvalId: Schema.decodeUnknownSync(ApprovalId)(values.approval),
      decision: positionals[0] === "allow" ? "allowed" : "denied",
    });
    process.stdout.write(`${result.body}\n`);
    return result.status === 200 ? 0 : 1;
  }
  if (verb === "input" && positionals[0] === "answer") {
    if (typeof values.run !== "string" || typeof values.answer !== "string") {
      throw new Error("--run and --answer KEY=VALUE are required");
    }
    const [key, value] = values.answer.split("=");
    const result = await commandFetch(control.endpoint, control.dataRoot, {
      kind: "answer_input",
      runId: Schema.decodeUnknownSync(RunId)(values.run),
      answers: { [key ?? "answer"]: value ?? "" },
    });
    process.stdout.write(`${result.body}\n`);
    return result.status === 200 ? 0 : 1;
  }
  if (verb === "run" && positionals[0] === "cancel") {
    if (typeof values.run !== "string") throw new Error("--run is required");
    const result = await commandFetch(control.endpoint, control.dataRoot, {
      kind: "cancel_run",
      runId: Schema.decodeUnknownSync(RunId)(values.run),
    });
    process.stdout.write(`${result.body}\n`);
    return result.status === 200 ? 0 : 1;
  }
  if (verb === "stop-all") {
    const result = await commandFetch(control.endpoint, control.dataRoot, { kind: "stop_all" });
    process.stdout.write(`${result.body}\n`);
    return result.status === 200 ? 0 : 1;
  }
  process.stderr.write(usage);
  return 2;
};
