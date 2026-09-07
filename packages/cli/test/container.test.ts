import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertCodexContainerPlatform,
  readCodexVersionInContainer,
  runContainerName,
  spawnCodexAppServerInContainer,
} from "../src/container.js";

const originalPath = process.env.PATH;

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
  writeFileSync(
    docker,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.AGENTIS_TEST_DOCKER_LOG, JSON.stringify(args) + "\\n");
if (args.includes("--version")) {
  process.stdout.write("codex-cli 0.153.4\\n");
  process.exit(0);
}
if (args[0] === "rm") process.exit(0);
setInterval(() => {}, 1000);
`,
    { mode: 0o700 },
  );
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
});

describe.sequential("Run containers", () => {
  it("does not bind a host workspace or owner credentials during version preflight", async () => {
    const { log } = fakeDocker();
    await readCodexVersionInContainer("0.153.4");
    const commands = await waitForLog(log, (entries) => entries.length === 1);
    const args = commands[0] ?? [];
    expect(args).not.toContain("type=bind,src=/tmp,dst=/workspace");
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
      stub: "/workspace/codex-stub.mjs",
    });
    await waitForLog(log, (commands) => commands.some((args) => args[0] === "run"));
    process.stop();
    const commands = await waitForLog(log, (entries) =>
      entries.some(
        (args) =>
          args[0] === "rm" && args[1] === "-f" && args[2] === runContainerName(runId),
      ),
    );
    expect(commands.some((args) => args.includes(`io.agentis.run-id=${runId}`))).toBe(true);
  });

  it("rejects a macOS host Codex binary before starting a Linux container", () => {
    expect(() => assertCodexContainerPlatform("darwin")).toThrow(
      /macOS Codex executable cannot run in the Linux Run container/,
    );
  });
});
