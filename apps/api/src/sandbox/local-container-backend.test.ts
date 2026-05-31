import { EventEmitter } from "node:events"
import { join } from "node:path"
import { describe, expect, it, beforeEach, vi } from "vitest"

const childProcess = vi.hoisted(() => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}))

vi.mock("node:child_process", () => childProcess)

import {
  buildDockerRunArgs,
  LocalContainerSandboxBackend,
} from "./local-container-backend.js"

function createMockChildProcess(input: {
  stdout?: string
  stderr?: string
  exitCode?: number | null
  closeDelayMs?: number
}) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
    exitCode: number | null
    killed: boolean
  }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.exitCode = null
  child.killed = false
  child.kill = vi.fn(() => {
    child.killed = true
    setTimeout(() => child.emit("close", null), 0)
    return true
  })

  if (input.closeDelayMs !== undefined) {
    setTimeout(() => {
      if (input.stdout) child.stdout.emit("data", Buffer.from(input.stdout))
      if (input.stderr) child.stderr.emit("data", Buffer.from(input.stderr))
      child.exitCode = input.exitCode ?? 0
      child.emit("close", input.exitCode ?? 0)
    }, input.closeDelayMs)
  }

  return child
}

describe("LocalContainerSandboxBackend", () => {
  beforeEach(() => {
    vi.useRealTimers()
    childProcess.spawn.mockReset()
    childProcess.spawnSync.mockReset()
    childProcess.spawnSync.mockReturnValue({
      status: 0,
      stdout: "Docker context is available\n",
      stderr: "",
    })
  })

  it("builds hardened docker argv for command execution", () => {
    const args = buildDockerRunArgs({
      image: "agentis-sandbox:local",
      filesRoot: "/tmp/agentis workspace/files",
      cwd: "/tmp/agentis workspace/files/src",
      kind: "command",
      command: "printf hello > output.txt",
    })

    expect(args).toEqual([
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
      "type=bind,src=/tmp/agentis workspace/files,dst=/workspace",
      "--env",
      "HOME=/tmp",
      "--env",
      "LANG=C.UTF-8",
      "-w",
      "/workspace/src",
      "agentis-sandbox:local",
      "sh",
      "-lc",
      "printf hello > output.txt",
    ])
  })

  it("mounts runtime scripts read-only for script execution", () => {
    const args = buildDockerRunArgs({
      image: "agentis-sandbox:local",
      filesRoot: "/tmp/agentis/files",
      cwd: "/tmp/agentis/files",
      kind: "script",
      argv: ["python3", "/tmp/agentis/runtime/scripts/exec-1.py", "ignored"],
    })

    expect(args).toContain(
      "type=bind,src=/tmp/agentis/runtime/scripts,dst=/runtime-scripts,readonly"
    )
    expect(args.slice(-4)).toEqual([
      "agentis-sandbox:local",
      "python3",
      "/runtime-scripts/exec-1.py",
      "ignored",
    ])
  })

  it("throws sandbox_backend_unavailable when the docker runtime is unavailable", async () => {
    childProcess.spawnSync.mockReturnValue({
      status: 1,
      stdout: "",
      stderr: "Cannot connect to the Docker daemon",
    })

    await expect(
      new LocalContainerSandboxBackend("agentis-sandbox:local").execute(
        {
          workspaceId: "workspace_test",
          filesRoot: "/tmp/agentis/files",
          kind: "command",
          command: "printf hello",
          cwd: "/tmp/agentis/files",
          timeoutMs: 1000,
          maxStdoutBytes: 100,
          maxStderrBytes: 100,
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "sandbox_backend_unavailable",
      message:
        "Docker-compatible runtime is not available for local-container sandbox execution.",
    })
    expect(childProcess.spawn).not.toHaveBeenCalled()
  })

  it("spawns docker directly and captures bounded output", async () => {
    childProcess.spawn.mockReturnValue(
      createMockChildProcess({
        stdout: "abcdef",
        stderr: "",
        exitCode: 0,
        closeDelayMs: 0,
      })
    )

    const result = await new LocalContainerSandboxBackend(
      "agentis-sandbox:local"
    ).execute(
      {
        workspaceId: "workspace_test",
        filesRoot: "/tmp/agentis/files",
        kind: "command",
        command: "printf abcdef",
        cwd: "/tmp/agentis/files",
        timeoutMs: 1000,
        maxStdoutBytes: 3,
        maxStderrBytes: 100,
      },
      new AbortController().signal
    )

    expect(childProcess.spawn).toHaveBeenCalledWith(
      "docker",
      expect.arrayContaining(["run", "--rm", "--network", "none"]),
      expect.objectContaining({
        cwd: "/tmp/agentis/files",
        shell: false,
      })
    )
    expect(result).toMatchObject({
      exitCode: 0,
      stdout: "abc",
      stderr: "",
      stdoutTruncated: true,
      stderrTruncated: false,
      timedOut: false,
      aborted: false,
    })
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("marks timed-out docker runs and terminates the spawned process", async () => {
    vi.useFakeTimers()
    const child = createMockChildProcess({ closeDelayMs: undefined })
    childProcess.spawn.mockReturnValue(child)

    const resultPromise = new LocalContainerSandboxBackend(
      "agentis-sandbox:local"
    ).execute(
      {
        workspaceId: "workspace_test",
        filesRoot: join("/tmp", "agentis", "files"),
        kind: "command",
        command: "node -e \"setTimeout(() => {}, 1000)\"",
        cwd: join("/tmp", "agentis", "files"),
        timeoutMs: 20,
        maxStdoutBytes: 100,
        maxStderrBytes: 100,
      },
      new AbortController().signal
    )

    await vi.advanceTimersByTimeAsync(25)
    const result = await resultPromise

    expect(child.kill).toHaveBeenCalledWith("SIGTERM")
    expect(result.exitCode).toBeNull()
    expect(result.timedOut).toBe(true)
    expect(result.aborted).toBe(false)
  })
})
