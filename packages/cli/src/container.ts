import {
  docker,
  prepareProviderNetwork,
  providerNetworkEnv,
  providerVolume,
  removeProviderNetwork,
} from "./provider.js";
import { CODEX_IMAGE } from "./versions.js";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

const CODEX_CONTAINER_PATH = "/usr/local/bin/codex";
const CODEX_STUB_CONTAINER_PATH = "/opt/agentis/codex-stub.mjs";
const MANAGED_CONTAINER_LABEL = "io.agentis.managed";
const RUN_ID_LABEL = "io.agentis.run-id";

const dockerRunBase = (input: {
  readonly workspace?: string;
  readonly workspaceReadonly?: boolean;
  readonly name?: string;
  readonly runId?: string;
  readonly extraEnv?: Record<string, string>;
  readonly network?: string;
}) => {
  const args = [
    "run",
    "--rm",
    "-i",
    "--pull=never",
    "--network",
    input.network ?? "none",
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
    args.push(
      "--mount",
      `type=bind,src=${input.workspace},dst=/workspace${input.workspaceReadonly ? ",readonly" : ""}`,
      "-w",
      "/workspace",
    );
  }
  for (const [key, value] of Object.entries(input.extraEnv ?? {})) {
    args.push("-e", `${key}=${value}`);
  }
  return args;
};

export const runContainerName = (runId: string) => `agentis-run-${runId}`;

export type RunContainerProcess = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly stop: () => void;
};

type ReadonlyBindMount = {
  readonly source: string;
  readonly destination: string;
};

export const removeRunContainer = (runId: string): void => {
  if (inspectRunContainer(runId) !== "absent") {
    spawnSync("docker", ["rm", "-f", runContainerName(runId)], { stdio: "ignore" });
    if (inspectRunContainer(runId) !== "absent") {
      throw new Error(`Run container ${runContainerName(runId)} survived removal`);
    }
  }
  removeProviderNetwork(runId);
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
  readonly image?: string;
  readonly network?: string;
  readonly providerAuthVolume?: string;
  readonly providerHomeVolume?: string;
  readonly workspaceReadonly?: boolean;
}): RunContainerProcess => {
  const name = runContainerName(input.runId);
  const args = dockerRunBase({
    workspace: input.workspace,
    ...(input.workspaceReadonly ? { workspaceReadonly: true } : {}),
    name,
    runId: input.runId,
    ...(input.network ? { network: input.network } : {}),
    ...(input.env ? { extraEnv: input.env } : {}),
  });
  for (const mount of input.readonlyMounts ?? []) {
    args.push("--mount", `type=bind,src=${mount.source},dst=${mount.destination},readonly`);
  }
  if (input.providerAuthVolume) {
    args.push(
      "--mount",
      `type=volume,src=${input.providerAuthVolume},dst=/provider-auth,readonly`,
      ...providerNetworkEnv,
    );
  }
  if (input.providerHomeVolume)
    args.push("--mount", `type=volume,src=${input.providerHomeVolume},dst=/provider-home`);
  args.push(input.image ?? "node:24-bookworm-slim", ...input.command);
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
  readonly dataRoot?: string;
  readonly loadSession?: boolean;
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
  if (!input.dataRoot) throw new Error("live Codex requires a provider data root");
  const volume = providerVolume(input.dataRoot);
  docker(["volume", "inspect", volume]);
  const homeVolume = `agentis-provider-state-${input.runId}`;
  docker(["volume", "create", "--label", "io.agentis.managed=provider-state", homeVolume]);
  const network = prepareProviderNetwork(input.runId);
  try {
    return spawnInRunContainer({
      runId: input.runId,
      workspace: input.workspace,
      image: CODEX_IMAGE,
      network,
      providerAuthVolume: volume,
      providerHomeVolume: homeVolume,
      ...(input.loadSession ? { workspaceReadonly: true } : {}),
      env: { CODEX_HOME: "/provider-home", HOME: "/provider-home" },
      command: [
        "sh",
        "-ec",
        'test -s /provider-auth/auth.json || exit 77; mkdir -m 700 -p "$CODEX_HOME"; cp /provider-auth/auth.json "$CODEX_HOME/auth.json"; exec "$@"',
        "agentis-codex",
        CODEX_CONTAINER_PATH,
        "-c",
        'cli_auth_credentials_store="file"',
        "--disable",
        "hooks",
        "app-server",
        "--listen",
        "stdio://",
      ],
    });
  } catch (error) {
    removeProviderNetwork(input.runId);
    throw error;
  }
};

export const readCodexVersionInContainer = async (pin: string) => {
  const args = dockerRunBase({});
  args.push(CODEX_IMAGE, CODEX_CONTAINER_PATH, "--version");
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
