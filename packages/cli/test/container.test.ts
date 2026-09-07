import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { loadOrCreateOwner } from "../src/auth.js";
import {
  assertCodexContainerPlatform,
  readCodexVersionInContainer,
  runContainerName,
  spawnCodexAppServerInContainer,
} from "../src/container.js";
import { startServer } from "../src/http.js";
import { newIdempotencyKey } from "../src/ids.js";

const originalPath = process.env.PATH;
const stub = fileURLToPath(new URL("./codex-stub.mjs", import.meta.url));
const fakeDockerScript = fileURLToPath(new URL("./fake-docker.mjs", import.meta.url));

const waitForLog = async (path: string, match: (commands: unknown[][]) => boolean) => {
  const deadline = Date.now() + 2000;
  while (Date.now() <= deadline) {
    const commands = readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown[]);
    if (match(commands)) {
      return commands;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`docker command not observed: ${readFileSync(path, "utf8")}`);
};

const fakeDocker = () => {
  const root = mkdtempSync(join(tmpdir(), "agentis-container-test-"));
  const bin = join(root, "bin");
  const docker = join(bin, "docker");
  const codex = join(bin, "codex");
  const log = join(root, "docker.log");
  mkdirSync(bin);
  writeFileSync(log, "");
  copyFileSync(fakeDockerScript, docker);
  writeFileSync(codex, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  chmodSync(docker, 0o700);
  chmodSync(codex, 0o700);
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
  process.env.AGENTIS_TEST_DOCKER_LOG = log;
  return { root, log };
};

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AGENTIS_TEST_DOCKER_LOG;
  delete process.env.AGENTIS_CODEX_STUB;
  delete process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS;
});

const port = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("no port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });

const command = async (endpoint: URL, token: string, body: unknown) => {
  const response = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return (await response.json()) as {
    accepted: boolean;
    runId?: string;
  };
};

const runStatus = async (endpoint: URL, token: string, runId: string) => {
  const response = await fetch(new URL("/v1/status", endpoint), {
    headers: { authorization: `Bearer ${token}` },
  });
  const snapshot = (await response.json()) as {
    runs: { id: string; status: string }[];
  };
  return snapshot.runs.find((run) => run.id === runId)?.status;
};

const waitForStatus = async (endpoint: URL, token: string, runId: string, status: string) => {
  const deadline = Date.now() + 2000;
  while (Date.now() <= deadline) {
    if ((await runStatus(endpoint, token, runId)) === status) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Run ${runId} did not reach ${status}`);
};

describe.sequential("Run containers", () => {
  it("does not bind a host workspace or owner credentials during version preflight", async () => {
    const { log } = fakeDocker();
    await readCodexVersionInContainer("0.153.4");
    const commands = await waitForLog(log, (entries) => entries.length === 1);
    const args = commands[0] ?? [];
    expect(args).not.toContain("type=bind,src=/tmp,dst=/workspace");
    expect(args.some((arg) => typeof arg === "string" && arg.endsWith("dst=/workspace"))).toBe(
      false,
    );
    expect(JSON.stringify(args)).not.toContain("owner.token");
  });

  it("removes the exact Run container when stopped", async () => {
    const { root, log } = fakeDocker();
    const runId = "run-3287";
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const process = spawnCodexAppServerInContainer({
      runId,
      workspace,
      stub,
    });
    await waitForLog(log, (commands) => commands.some((args) => args[0] === "run"));
    process.stop();
    const commands = await waitForLog(log, (entries) =>
      entries.some(
        (args) => args[0] === "rm" && args[1] === "-f" && args[2] === runContainerName(runId),
      ),
    );
    expect(commands.some((args) => args.includes(`io.agentis.run-id=${runId}`))).toBe(true);
  });

  it("isolates sequential Run mounts and removes both terminal containers", async () => {
    const { root, log } = fakeDocker();
    process.env.AGENTIS_CODEX_STUB = stub;
    process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS = "2000";
    const endpoint = new URL(`http://127.0.0.1:${await port()}`);
    const server = await Effect.runPromise(
      startServer({
        endpoint,
        dataRoot: root,
        workspace: join(root, "scratch"),
        provider: "codex",
        executionBoundary: "docker-desktop-run-container",
      }),
    );
    const owner = await Effect.runPromise(loadOrCreateOwner(root));
    try {
      const first = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "INPUT first" },
      });
      expect(first.runId).toBeDefined();
      if (!first.runId) {
        throw new Error("first Run was not created");
      }
      const firstRunId = first.runId;
      await waitForStatus(endpoint, owner.token, firstRunId, "waiting_input");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: firstRunId },
      });
      await waitForStatus(endpoint, owner.token, firstRunId, "canceled");
      await waitForLog(log, (entries) =>
        entries.some((args) => args[2] === runContainerName(firstRunId)),
      );

      const second = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "INPUT second" },
      });
      expect(second.runId).toBeDefined();
      if (!second.runId) {
        throw new Error("second Run was not created");
      }
      const secondRunId = second.runId;
      await waitForStatus(endpoint, owner.token, secondRunId, "waiting_input");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "answer_input", runId: secondRunId, answers: { color: "Blue" } },
      });
      await waitForStatus(endpoint, owner.token, secondRunId, "succeeded");
      const commands = await waitForLog(log, (entries) =>
        entries.some((args) => args[2] === runContainerName(secondRunId)),
      );
      const mounts = commands
        .filter((args) => args[0] === "run")
        .flatMap((args) =>
          args.filter(
            (arg): arg is string =>
              typeof arg === "string" &&
              arg.startsWith("type=bind,") &&
              arg.includes("dst=/workspace"),
          ),
        );
      expect(mounts).toEqual([
        `type=bind,src=${join(root, "scratch", "runs", firstRunId)},dst=/workspace`,
        `type=bind,src=${join(root, "scratch", "runs", secondRunId)},dst=/workspace`,
      ]);
      const ownerCredential = join(root, "owner.token");
      const mountSources = commands
        .flatMap((args) => args)
        .filter((arg): arg is string => typeof arg === "string" && arg.startsWith("type=bind,"))
        .flatMap((arg) => arg.match(/^type=bind,src=(.*),dst=/)?.[1] ?? []);
      expect(
        mountSources.some(
          (source) => ownerCredential === source || ownerCredential.startsWith(`${source}/`),
        ),
      ).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("rejects a macOS host Codex binary before starting a Linux container", () => {
    expect(() => assertCodexContainerPlatform("darwin")).toThrow(
      /macOS Codex executable cannot run in the Linux Run container/,
    );
  });
});
