import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import type {
  SandboxBackend,
  SandboxExecuteInput,
  SandboxExecuteResult,
} from "./types.js"

type StreamCapture = {
  text: string
  truncated: boolean
  push(chunk: Buffer): void
}

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

function buildEnv(
  filesRoot: string,
  extraEnv: Record<string, string> | undefined
): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "",
    HOME: filesRoot,
    LANG: process.env.LANG ?? "C.UTF-8",
    ...extraEnv,
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

export class LocalProcessSandboxBackend implements SandboxBackend {
  execute(
    input: SandboxExecuteInput,
    signal: AbortSignal
  ): Promise<SandboxExecuteResult> {
    const startedAt = Date.now()
    const stdout = createStreamCapture(input.maxStdoutBytes)
    const stderr = createStreamCapture(input.maxStderrBytes)
    let timedOut = false
    let aborted = signal.aborted

    return new Promise((resolve, reject) => {
      const child =
        input.kind === "command"
          ? spawn(input.command ?? "", {
              cwd: input.cwd,
              env: buildEnv(input.filesRoot, input.env),
              shell: true,
            })
          : spawn(input.argv?.[0] ?? "", input.argv?.slice(1) ?? [], {
              cwd: input.cwd,
              env: buildEnv(input.filesRoot, input.env),
              shell: false,
            })

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
