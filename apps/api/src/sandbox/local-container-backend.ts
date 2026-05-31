import { spawn } from "node:child_process"
import path from "node:path"
import type {
  SandboxBackend,
  SandboxExecuteInput,
  SandboxExecuteResult,
} from "./types.js"
import { collectProcessResult } from "./process-result.js"
import { WorkspaceError } from "../workspaces/workspace-service.js"

type DockerRunArgsInput = {
  image: string
  filesRoot: string
  kind: SandboxExecuteInput["kind"]
  command?: string
  argv?: string[]
  cwd: string
  env?: Record<string, string>
}

const DOCKER_RUNTIME_UNAVAILABLE_MESSAGE =
  "Docker-compatible runtime is not available for local-container sandbox execution."

function workspaceCwd(filesRoot: string, cwd: string): string {
  const resolvedFilesRoot = path.resolve(filesRoot)
  const resolvedCwd = path.resolve(cwd)
  const relativePath = path.relative(resolvedFilesRoot, resolvedCwd)
  if (!relativePath) return "/workspace"
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new WorkspaceError(
      "sandbox_invalid_cwd",
      "Sandbox cwd must stay within the workspace files root."
    )
  }
  return `/workspace/${relativePath.split(path.sep).join("/")}`
}

function scriptArgv(argv: string[] | undefined): {
  command: string[]
  scriptDirectory: string
} {
  const [binary, scriptPath, ...rest] = argv ?? []
  if (!binary || !scriptPath) {
    throw new WorkspaceError(
      "sandbox_script_required",
      "Container sandbox script execution requires an interpreter and script path."
    )
  }
  return {
    command: [binary, `/runtime-scripts/${path.basename(scriptPath)}`, ...rest],
    scriptDirectory: path.dirname(scriptPath),
  }
}

export function buildDockerRunArgs(input: DockerRunArgsInput): string[] {
  const args = [
    "run",
    "--rm",
    "--network",
    "none",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,nodev,size=64m",
    "--cpus",
    "1",
    "--memory",
    "512m",
    "--pids-limit",
    "128",
    "--mount",
    `type=bind,src=${input.filesRoot},dst=/workspace`,
    "--env",
    "HOME=/tmp",
    "--env",
    "LANG=C.UTF-8",
  ]

  const command =
    input.kind === "command"
      ? ["sh", "-lc", input.command ?? ""]
      : (() => {
          const script = scriptArgv(input.argv)
          args.push(
            "--mount",
            `type=bind,src=${script.scriptDirectory},dst=/runtime-scripts,readonly`
          )
          return script.command
        })()

  for (const [key, value] of Object.entries(input.env ?? {})) {
    args.push("--env", `${key}=${value}`)
  }

  args.push(
    "-w",
    workspaceCwd(input.filesRoot, input.cwd),
    input.image,
    ...command
  )
  return args
}

export class LocalContainerSandboxBackend implements SandboxBackend {
  private dockerAvailable: Promise<void> | undefined

  constructor(private readonly image: string) {}

  async execute(
    input: SandboxExecuteInput,
    signal: AbortSignal
  ): Promise<SandboxExecuteResult> {
    await this.ensureDockerAvailable(signal)

    const startedAt = Date.now()
    const child = spawn(
      "docker",
      buildDockerRunArgs({ ...input, image: this.image }),
      {
        cwd: input.filesRoot,
        env: {
          ...process.env,
          PATH: process.env.PATH ?? "",
        },
        shell: false,
      }
    )

    return collectProcessResult(child, input, signal, startedAt)
  }

  private ensureDockerAvailable(signal: AbortSignal): Promise<void> {
    this.dockerAvailable ??= this.checkDockerAvailable(signal)
    return this.dockerAvailable
  }

  private async checkDockerAvailable(signal: AbortSignal): Promise<void> {
    const child = spawn("docker", ["info", "--format", "{{.ServerVersion}}"], {
      env: {
        ...process.env,
        PATH: process.env.PATH ?? "",
      },
      shell: false,
    })
    const result = await collectProcessResult(
      child,
      {
        timeoutMs: 3_000,
        maxStdoutBytes: 1024,
        maxStderrBytes: 4096,
      },
      signal,
      Date.now()
    ).catch((error) => {
      this.dockerAvailable = undefined
      throw new WorkspaceError(
        "sandbox_backend_unavailable",
        DOCKER_RUNTIME_UNAVAILABLE_MESSAGE,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      )
    })
    if (result.exitCode !== 0) {
      this.dockerAvailable = undefined
      throw new WorkspaceError(
        "sandbox_backend_unavailable",
        DOCKER_RUNTIME_UNAVAILABLE_MESSAGE,
        {
          stderr: result.stderr,
          error:
            result.timedOut || result.aborted
              ? "Docker availability check did not complete."
              : undefined,
        }
      )
    }
  }
}
