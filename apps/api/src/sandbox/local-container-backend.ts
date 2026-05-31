import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process"
import path from "node:path"
import type {
  SandboxBackend,
  SandboxExecuteInput,
  SandboxExecuteResult,
} from "./types.js"
import { WorkspaceError } from "../workspaces/workspace-service.js"

type StreamCapture = {
  text: string
  truncated: boolean
  push(chunk: Buffer): void
}

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

function createStreamCapture(maxBytes: number): StreamCapture {
  let captured = Buffer.alloc(0)
  let truncated = false
  return {
    get text() {
      return captured.toString("utf8")
    },
    get truncated() {
      return truncated
    },
    push(chunk: Buffer) {
      if (captured.length >= maxBytes) {
        truncated = true
        return
      }
      const remaining = maxBytes - captured.length
      if (chunk.length > remaining) {
        truncated = true
      }
      captured = Buffer.concat([captured, chunk.subarray(0, remaining)])
    },
  }
}

function terminateChild(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || child.killed) return
  child.kill("SIGTERM")
  setTimeout(() => {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGKILL")
    }
  }, 100).unref()
}

function workspaceCwd(filesRoot: string, cwd: string) {
  const relativePath = path.relative(filesRoot, cwd)
  if (!relativePath) return "/workspace"
  return `/workspace/${relativePath.split(path.sep).join("/")}`
}

function scriptArgv(argv: string[] | undefined) {
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

  args.push("-w", workspaceCwd(input.filesRoot, input.cwd), input.image, ...command)
  return args
}

export class LocalContainerSandboxBackend implements SandboxBackend {
  constructor(private readonly image: string) {}

  async execute(
    input: SandboxExecuteInput,
    signal: AbortSignal
  ): Promise<SandboxExecuteResult> {
    const docker = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
      encoding: "utf8",
    })
    if (docker.error || docker.status !== 0) {
      throw new WorkspaceError(
        "sandbox_backend_unavailable",
        DOCKER_RUNTIME_UNAVAILABLE_MESSAGE,
        {
          stderr: docker.stderr?.toString(),
          error: docker.error?.message,
        }
      )
    }

    const startedAt = Date.now()
    const stdout = createStreamCapture(input.maxStdoutBytes)
    const stderr = createStreamCapture(input.maxStderrBytes)
    let timedOut = false
    let aborted = signal.aborted

    return new Promise((resolve, reject) => {
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

      const timeout = setTimeout(() => {
        timedOut = true
        terminateChild(child)
      }, input.timeoutMs)

      const abort = () => {
        aborted = true
        terminateChild(child)
      }
      signal.addEventListener("abort", abort, { once: true })

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))
      child.on("error", (error) => {
        clearTimeout(timeout)
        signal.removeEventListener("abort", abort)
        reject(error)
      })
      child.on("close", (code) => {
        clearTimeout(timeout)
        signal.removeEventListener("abort", abort)
        resolve({
          exitCode: timedOut || aborted ? null : code,
          stdout: stdout.text,
          stderr: stderr.text,
          stdoutTruncated: stdout.truncated,
          stderrTruncated: stderr.truncated,
          durationMs: Date.now() - startedAt,
          timedOut,
          aborted,
        })
      })

      if (signal.aborted) {
        abort()
      }
    })
  }
}
