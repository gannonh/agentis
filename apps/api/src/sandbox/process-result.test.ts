import { EventEmitter } from "node:events"
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import { describe, expect, it, vi } from "vitest"
import { collectProcessResult } from "./process-result.js"

function mockChild(pid: number) {
  const child = new EventEmitter() as EventEmitter & {
    pid: number
    stdout: EventEmitter
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
    exitCode: number | null
    killed: boolean
  }
  child.pid = pid
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn(() => {
    child.killed = true
    return true
  })
  child.exitCode = null
  child.killed = false
  return child
}

describe("collectProcessResult", () => {
  it("escalates timeout termination to the process group", async () => {
    vi.useFakeTimers()
    const child = mockChild(12345)
    const kill = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid === -12345 && signal === "SIGKILL") {
        child.emit("close", null)
      }
      return true
    })

    const resultPromise = collectProcessResult(
      child as unknown as ChildProcessWithoutNullStreams,
      {
        timeoutMs: 20,
        maxStdoutBytes: 100,
        maxStderrBytes: 100,
      },
      new AbortController().signal,
      Date.now()
    )

    await vi.advanceTimersByTimeAsync(125)
    const result = await resultPromise

    expect(kill).toHaveBeenCalledWith(-12345, "SIGTERM")
    expect(kill).toHaveBeenCalledWith(-12345, "SIGKILL")
    expect(result).toMatchObject({ exitCode: null, timedOut: true })
    kill.mockRestore()
    vi.useRealTimers()
  })
})
