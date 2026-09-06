import { realpathSync } from "node:fs";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

const dockerRunBase = (workspace: string, extraEnv: Record<string, string> = {}) => {
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
    "--mount",
    `type=bind,src=${workspace},dst=/workspace`,
    "-w",
    "/workspace",
    "-e",
    "HOME=/tmp/codex-home",
    "-e",
    "NO_OPEN_BROWSER=1",
  ];
  for (const [key, value] of Object.entries(extraEnv)) {
    args.push("-e", `${key}=${value}`);
  }
  return args;
};

const resolveCodexBinary = () => {
  const which = spawnSync("which", ["codex"], { encoding: "utf8" });
  if (which.status !== 0 || !which.stdout.trim()) {
    throw new Error("codex not found on PATH");
  }
  return realpathSync(which.stdout.trim());
};

export const spawnInRunContainer = (input: {
  readonly workspace: string;
  readonly command: readonly string[];
  readonly env?: Record<string, string>;
}): ChildProcessWithoutNullStreams => {
  const args = dockerRunBase(input.workspace, input.env ?? {});
  args.push("node:24-bookworm-slim", ...input.command);
  return spawn("docker", args, {
    cwd: input.workspace,
    stdio: ["pipe", "pipe", "pipe"],
  });
};

export const spawnCodexAppServerInContainer = (input: {
  readonly workspace: string;
  readonly stub?: string;
}): ChildProcessWithoutNullStreams => {
  if (input.stub) {
    return spawnInRunContainer({
      workspace: input.workspace,
      env: { AGENTIS_CODEX_STUB: input.stub, PATH: "/usr/local/bin:/usr/bin:/bin" },
      command: ["node", input.stub],
    });
  }
  const codex = resolveCodexBinary();
  const args = dockerRunBase(input.workspace);
  args.push("-v", `${codex}:${codex}:ro`);
  args.push("node:24-bookworm-slim", "node", codex, "--disable", "hooks", "app-server", "--listen", "stdio://");
  return spawn("docker", args, {
    cwd: input.workspace,
    stdio: ["pipe", "pipe", "pipe"],
  });
};

export const readCodexVersionInContainer = async (pin: string) => {
  const codex = resolveCodexBinary();
  const args = dockerRunBase("/tmp");
  args.push("-v", `${codex}:${codex}:ro`);
  args.push("node:24-bookworm-slim", "node", codex, "--version");
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
