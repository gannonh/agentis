import type { ChildProcessWithoutNullStreams } from "node:child_process"
import type { SandboxExecuteInput, SandboxExecuteResult } from "./types.js"

type StreamCapture = {
  text: string
  truncated: boolean
  push(chunk: Buffer): void
}

type ProcessResultLimits = Pick<
  SandboxExecuteInput,
  "timeoutMs" | "maxStdoutBytes" | "maxStderrBytes"
>

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

function terminateChild(child: ChildProcessWithoutNullStreams): void {
  if (child.exitCode !== null) return
  signalChild(child, "SIGTERM")
  setTimeout(() => {
    if (child.exitCode === null) {
      signalChild(child, "SIGKILL")
    }
  }, 100).unref()
}

function signalChild(
  child: ChildProcessWithoutNullStreams,
  signal: NodeJS.Signals
): void {
  if (child.exitCode !== null) return
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, signal)
      return
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ESRCH"
      ) {
        throw error
      }
    }
  }
  child.kill(signal)
}

export function collectProcessResult(
  child: ChildProcessWithoutNullStreams,
  limits: ProcessResultLimits,
  signal: AbortSignal,
  startedAt: number
): Promise<SandboxExecuteResult> {
  const stdout = createStreamCapture(limits.maxStdoutBytes)
  const stderr = createStreamCapture(limits.maxStderrBytes)
  let timedOut = false
  let aborted = signal.aborted

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      timedOut = true
      terminateChild(child)
    }, limits.timeoutMs)

    const cleanup = () => {
      clearTimeout(timeout)
      signal.removeEventListener("abort", abort)
    }

    const abort = () => {
      aborted = true
      terminateChild(child)
    }
    signal.addEventListener("abort", abort, { once: true })

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))
    child.on("error", (error) => {
      cleanup()
      reject(error)
    })
    child.on("close", (code) => {
      cleanup()
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
