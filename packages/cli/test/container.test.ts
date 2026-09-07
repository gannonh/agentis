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
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadOrCreateOwner } from "../src/auth.js";
import {
  readCodexVersionInContainer,
  removeRunContainer,
  runContainerName,
  spawnCodexAppServerInContainer,
} from "../src/container.js";
import { runCli } from "../src/cli.js";
import { startServer } from "../src/http.js";
import { newIdempotencyKey } from "../src/ids.js";
import { openStore } from "../src/store.js";

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

const waitForFile = async (path: string) => {
  const deadline = Date.now() + 2000;
  while (Date.now() <= deadline) {
    try {
      readFileSync(path);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`file not observed: ${path}`);
};

const fakeDocker = () => {
  const root = mkdtempSync(join(tmpdir(), "agentis-container-test-"));
  const bin = join(root, "bin");
  const docker = join(bin, "docker");
  const codex = join(bin, "codex");
  const log = join(root, "docker.log");
  const state = `${log}.state`;
  mkdirSync(bin);
  writeFileSync(log, "");
  copyFileSync(fakeDockerScript, docker);
  writeFileSync(codex, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  chmodSync(docker, 0o700);
  chmodSync(codex, 0o700);
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
  process.env.AGENTIS_TEST_DOCKER_LOG = log;
  return { root, log, state };
};

afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.AGENTIS_TEST_DOCKER_LOG;
  delete process.env.AGENTIS_TEST_PREFLIGHT_HOLD;
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

  it("provisions a pinned Linux image and dedicated provider volume through the CLI", async () => {
    const { root, log } = fakeDocker();
    await expect(runCli(["provider", "provision", "--data-root", root])).resolves.toBe(0);
    const commands = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    expect(
      commands.some((args) => args[0] === "build" && args.includes("agentis-codex:0.153.4")),
    ).toBe(true);
    expect(commands.some((args) => args[0] === "volume" && args[1] === "create")).toBe(true);
    expect(readFileSync(`${log}.squid`, "utf8")).toContain(
      "acl provider dstdomain -n auth.openai.com chatgpt.com",
    );
    expect(JSON.stringify(commands)).not.toContain("owner.token");
  });

  it("runs native device login using only dedicated provider storage and restricted egress", async () => {
    const { root, log } = fakeDocker();
    await expect(runCli(["provider", "login", "--data-root", root])).resolves.toBe(0);
    const commands = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    const login = commands.find((args) => args.includes("--device-auth")) ?? [];
    expect(login).toContain("CODEX_HOME=/provider-auth");
    expect(
      login.some(
        (arg) =>
          arg.startsWith("type=volume,src=agentis-codex-auth-") &&
          arg.endsWith("dst=/provider-auth"),
      ),
    ).toBe(true);
    expect(login.some((arg) => arg.startsWith("type=bind,"))).toBe(false);
    expect(login).toContain("HTTPS_PROXY=http://provider-proxy:3128");
    expect(commands.some((args) => args[0] === "network" && args.includes("--internal"))).toBe(
      true,
    );
  });

  it("starts live Codex with run-local auth and removes its proxy and internal network", async () => {
    const { root, log } = fakeDocker();
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const run = spawnCodexAppServerInContainer({ runId: "live-test", workspace, dataRoot: root });
    await waitForLog(log, (entries) => entries.some((args) => args.includes("app-server")));
    run.stop();
    const commands = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    const network = commands.find((args) => args[0] === "network" && args[1] === "create") ?? [];
    expect(network).toContain("--internal");
    expect(network).toContain("com.docker.network.bridge.gateway_mode_ipv4=isolated");
    expect(network).toContain("--ipv6=false");
    const launch = commands.find((args) => args.includes("app-server")) ?? [];
    expect(launch).toContain("CODEX_HOME=/provider-home");
    expect(launch).toContain("agentis-net-live-test");
    expect(
      launch.some(
        (arg) => arg.startsWith("type=volume,") && arg.endsWith("dst=/provider-auth,readonly"),
      ),
    ).toBe(true);
    expect(
      commands.some((args) => args[0] === "rm" && args.includes("agentis-egress-live-test")),
    ).toBe(true);
    expect(
      commands.some(
        (args) => args[0] === "network" && args[1] === "rm" && args[2] === "agentis-net-live-test",
      ),
    ).toBe(true);
  });

  it("removes the exact Run container when stopped", async () => {
    const { root, log, state } = fakeDocker();
    const runId = "run-3287";
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const process = spawnCodexAppServerInContainer({
      runId,
      workspace,
      stub,
    });
    await waitForLog(log, (commands) => commands.some((args) => args[0] === "run"));
    await waitForFile(state);
    process.stop();
    const commands = await waitForLog(log, (entries) =>
      entries.some(
        (args) => args[0] === "rm" && args[1] === "-f" && args[2] === runContainerName(runId),
      ),
    );
    expect(commands.some((args) => args.includes("io.agentis.managed=run-container"))).toBe(true);
    expect(commands.some((args) => args.includes(`io.agentis.run-id=${runId}`))).toBe(true);
    expect(
      commands.filter((args) => args[0] === "inspect" && args.at(-1) === runContainerName(runId)),
    ).toHaveLength(2);
    expect(() => readFileSync(state)).toThrow();
  });

  it("refuses to remove a container without Agentis ownership labels", () => {
    const { log, state } = fakeDocker();
    const runId = "run-foreign";
    writeFileSync(
      state,
      JSON.stringify({
        name: runContainerName(runId),
        managed: "foreign",
        runId,
      }),
    );
    expect(() => removeRunContainer(runId)).toThrow(/refusing to remove unowned container/);
    const commands = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown[]);
    expect(commands.some((args) => args[0] === "rm")).toBe(false);
  });

  it("removes an owned terminal container before restart begins serving", async () => {
    const { root, state } = fakeDocker();
    const store = await Effect.runPromise(openStore(root));
    const submitted = await Effect.runPromise(
      store.applyCommand({
        principal: { kind: "owner", sessionId: "owner-session" },
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "terminal orphan" },
        nowMs: Date.now(),
        provider: "codex",
        executionBoundary: "docker-desktop-run-container",
        workspaceId: join(root, "scratch"),
      }),
    );
    expect(submitted.runId).toBeDefined();
    if (!submitted.runId) {
      throw new Error("Run was not created");
    }
    const runId = submitted.runId;
    await Effect.runPromise(
      store.applyCommand({
        principal: { kind: "owner", sessionId: "owner-session" },
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId },
        nowMs: Date.now(),
        provider: "codex",
        executionBoundary: "docker-desktop-run-container",
        workspaceId: join(root, "scratch"),
      }),
    );
    await Effect.runPromise(store.close());
    writeFileSync(
      state,
      JSON.stringify({
        name: runContainerName(runId),
        managed: "run-container",
        runId,
      }),
    );

    const server = await Effect.runPromise(
      startServer({
        endpoint: new URL(`http://127.0.0.1:${await port()}`),
        dataRoot: root,
        workspace: join(root, "scratch"),
        provider: "codex",
        executionBoundary: "docker-desktop-run-container",
      }),
    );
    try {
      expect(() => readFileSync(state)).toThrow();
    } finally {
      await server.close();
    }
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

  it("fails only the Run when Docker disappears while the container is active", async () => {
    const { root, state } = fakeDocker();
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
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const active = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "INPUT wait for docker loss" },
      });
      if (!active.runId) {
        throw new Error("Run was not created");
      }
      await waitForStatus(endpoint, owner.token, active.runId, "waiting_input");
      const { pid } = JSON.parse(readFileSync(state, "utf8")) as { pid: number };
      writeFileSync(
        join(root, "bin", "docker"),
        "#!/bin/sh\necho 'Cannot connect to the Docker daemon' >&2\nexit 1\n",
        { mode: 0o700 },
      );
      process.kill(pid, "SIGTERM");
      await waitForStatus(endpoint, owner.token, active.runId, "failed");
      expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join("")).toMatch(
        new RegExp(`run ${active.runId} cleanup failed: could not inspect Run container`),
      );
      const health = await fetch(new URL("/v1/health", endpoint));
      expect(health.status).toBe(200);
    } finally {
      stderr.mockRestore();
      copyFileSync(fakeDockerScript, join(root, "bin", "docker"));
      chmodSync(join(root, "bin", "docker"), 0o700);
      await server.close();
    }
  });

  it("uses the pinned Linux payload for preflight without mounting a host executable", async () => {
    const { log } = fakeDocker();
    await readCodexVersionInContainer("0.153.4");
    const commands = await waitForLog(log, (entries) => entries.length === 1);
    expect(commands[0]).toContain("agentis-codex:0.153.4");
    expect(
      commands[0]?.some((arg) => typeof arg === "string" && arg.startsWith("type=bind,")),
    ).toBe(false);
  });
  it("does not launch after stop-all during native version preflight", async () => {
    const { root, log } = fakeDocker();
    process.env.AGENTIS_TEST_PREFLIGHT_HOLD = "1";
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
      const submitted = command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "cancel before spawn" },
      });
      await waitForLog(log, (commands) => commands.some((args) => args.includes("--version")));
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "stop_all" },
      });
      writeFileSync(`${log}.release`, "");
      const receipt = await submitted;
      expect(await runStatus(endpoint, owner.token, receipt.runId ?? "")).toBe("canceled");
      const commands = readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      expect(commands.some((args) => args.includes("app-server"))).toBe(false);
    } finally {
      writeFileSync(`${log}.release`, "");
      await server.close();
    }
  });
  it("does not load a session after stop-all during native version preflight", async () => {
    const { root, log } = fakeDocker();
    process.env.AGENTIS_CODEX_STUB = stub;
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
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      if (!submitted.runId) throw new Error("missing run");
      await waitForStatus(endpoint, owner.token, submitted.runId, "succeeded");
      delete process.env.AGENTIS_CODEX_STUB;
      process.env.AGENTIS_TEST_PREFLIGHT_HOLD = "1";
      writeFileSync(log, "");
      const loading = command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: submitted.runId },
      });
      await waitForLog(log, (commands) => commands.some((args) => args.includes("--version")));
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "stop_all" },
      });
      writeFileSync(`${log}.release`, "");
      await loading;
      expect(await runStatus(endpoint, owner.token, submitted.runId)).toBe("succeeded");
      const commands = readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      expect(commands.some((args) => args.includes("app-server"))).toBe(false);
    } finally {
      writeFileSync(`${log}.release`, "");
      await server.close();
    }
  });
});
