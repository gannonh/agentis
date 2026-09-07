import { realpathSync } from "node:fs";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

const CODEX_CONTAINER_PATH = "/usr/local/bin/codex";
const CODEX_STUB_CONTAINER_PATH = "/opt/agentis/codex-stub.mjs";
const MANAGED_CONTAINER_LABEL = "io.agentis.managed";
const RUN_ID_LABEL = "io.agentis.run-id";

const dockerRunBase = (input: {
  readonly workspace?: string;
  readonly name?: string;
  readonly runId?: string;
  readonly extraEnv?: Record<string, string>;
}) => {
  const args = [
    "run",
    "--rm",
    "-i",
    "--pull=never",
    "--network",
    "none",
    "--read-only",
    "--user=10001:10001",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--pids-limit=128",
    "--memory=2g",
    "--cpus=2",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=134217728",
    "-e",
    "HOME=/tmp/codex-home",
    "-e",
    "NO_OPEN_BROWSER=1",
  ];
  if (input.name) {
    args.push("--name", input.name);
  }
  if (input.runId) {
    args.push(
      "--label",
      `${MANAGED_CONTAINER_LABEL}=run-container`,
      "--label",
      `${RUN_ID_LABEL}=${input.runId}`,
    );
  }
  if (input.workspace) {
    args.push("--mount", `type=bind,src=${input.workspace},dst=/workspace`, "-w", "/workspace");
  }
  for (const [key, value] of Object.entries(input.extraEnv ?? {})) {
    args.push("-e", `${key}=${value}`);
  }
  return args;
};

export const runContainerName = (runId: string) => `agentis-run-${runId}`;

export const assertCodexContainerPlatform = (
  platform: NodeJS.Platform = process.platform,
): void => {
  if (platform === "darwin") {
    throw new Error(
      "macOS Codex executable cannot run in the Linux Run container; " +
        "a Linux Codex payload, container-scoped authentication, and provider network access are not provisioned",
    );
  }
};

const resolveCodexBinary = () => {
  const which = spawnSync("which", ["codex"], { encoding: "utf8" });
  if (which.status !== 0 || !which.stdout.trim()) {
    throw new Error("codex not found on PATH");
  }
  return realpathSync(which.stdout.trim());
};

export type RunContainerProcess = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly stop: () => void;
};

type ReadonlyBindMount = {
  readonly source: string;
  readonly destination: string;
};

export const removeRunContainer = (runId: string): void => {
  if (inspectRunContainer(runId) === "absent") {
    return;
  }
  spawnSync("docker", ["rm", "-f", runContainerName(runId)], { stdio: "ignore" });
  if (inspectRunContainer(runId) !== "absent") {
    throw new Error(`Run container ${runContainerName(runId)} survived removal`);
  }
};

const inspectRunContainer = (runId: string): "owned" | "absent" => {
  const name = runContainerName(runId);
  const inspected = spawnSync(
    "docker",
    [
      "inspect",
      "--type",
      "container",
      "--format",
      `{{index .Config.Labels "${MANAGED_CONTAINER_LABEL}"}}|{{index .Config.Labels "${RUN_ID_LABEL}"}}`,
      name,
    ],
    { encoding: "utf8" },
  );
  if (inspected.error) {
    throw inspected.error;
  }
  if (inspected.status !== 0) {
    if (/No such (object|container)/i.test(inspected.stderr)) {
      return "absent";
    }
    throw new Error(`could not inspect Run container ${name}: ${inspected.stderr.trim()}`);
  }
  if (inspected.stdout.trim() !== `run-container|${runId}`) {
    throw new Error(`refusing to remove unowned container ${name}`);
  }
  return "owned";
};

export const spawnInRunContainer = (input: {
  readonly runId: string;
  readonly workspace: string;
  readonly command: readonly string[];
  readonly env?: Record<string, string>;
  readonly readonlyMounts?: readonly ReadonlyBindMount[];
}): RunContainerProcess => {
  const name = runContainerName(input.runId);
  const args = dockerRunBase({
    workspace: input.workspace,
    name,
    runId: input.runId,
    ...(input.env ? { extraEnv: input.env } : {}),
  });
  for (const mount of input.readonlyMounts ?? []) {
    args.push("--mount", `type=bind,src=${mount.source},dst=${mount.destination},readonly`);
  }
  args.push("node:24-bookworm-slim", ...input.command);
  const child = spawn("docker", args, {
    cwd: input.workspace,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    child,
    stop: () => {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGTERM");
      }
      removeRunContainer(input.runId);
    },
  };
};

export const spawnCodexAppServerInContainer = (input: {
  readonly runId: string;
  readonly workspace: string;
  readonly stub?: string;
}): RunContainerProcess => {
  if (input.stub) {
    return spawnInRunContainer({
      runId: input.runId,
      workspace: input.workspace,
      env: {
        AGENTIS_CODEX_STUB: CODEX_STUB_CONTAINER_PATH,
        PATH: "/usr/local/bin:/usr/bin:/bin",
      },
      readonlyMounts: [
        {
          source: input.stub,
          destination: CODEX_STUB_CONTAINER_PATH,
        },
      ],
      command: ["node", CODEX_STUB_CONTAINER_PATH],
    });
  }
  assertCodexContainerPlatform();
  const codex = resolveCodexBinary();
  return spawnInRunContainer({
    runId: input.runId,
    workspace: input.workspace,
    readonlyMounts: [{ source: codex, destination: CODEX_CONTAINER_PATH }],
    command: [CODEX_CONTAINER_PATH, "--disable", "hooks", "app-server", "--listen", "stdio://"],
  });
};

export const readCodexVersionInContainer = async (pin: string) => {
  assertCodexContainerPlatform();
  const codex = resolveCodexBinary();
  const args = dockerRunBase({});
  args.push("--mount", `type=bind,src=${codex},dst=${CODEX_CONTAINER_PATH},readonly`);
  args.push("node:24-bookworm-slim", CODEX_CONTAINER_PATH, "--version");
  const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
  const text = await new Promise<string>((resolve, reject) => {
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`codex --version in container exited ${code}`));
    });
  });
  if (!text.includes(pin)) {
    throw new Error(`expected Codex ${pin} in container, found ${text}`);
  }
};
