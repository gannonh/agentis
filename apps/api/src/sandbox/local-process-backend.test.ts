import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"
import { LocalProcessSandboxBackend } from "./local-process-backend.js"

async function createFilesRoot() {
  const root = join(tmpdir(), `agentis-process-${randomUUID()}`, "files")
  await mkdir(root, { recursive: true })
  return root
}

describe("LocalProcessSandboxBackend", () => {
  it("runs a command in the workspace cwd and captures stdout", async () => {
    const filesRoot = await createFilesRoot()
    try {
      const result = await new LocalProcessSandboxBackend().execute(
        {
          workspaceId: "workspace_test",
          filesRoot,
          kind: "command",
          command: "printf hello",
          cwd: filesRoot,
          timeoutMs: 1000,
          maxStdoutBytes: 100,
          maxStderrBytes: 100,
        },
        new AbortController().signal
      )

      expect(result).toMatchObject({
        exitCode: 0,
        stdout: "hello",
        stderr: "",
        timedOut: false,
        aborted: false,
      })
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    } finally {
      await rm(join(filesRoot, ".."), { recursive: true, force: true })
    }
  })

  it("truncates output by configured byte caps", async () => {
    const filesRoot = await createFilesRoot()
    try {
      const result = await new LocalProcessSandboxBackend().execute(
        {
          workspaceId: "workspace_test",
          filesRoot,
          kind: "command",
          command: "printf abcdef",
          cwd: filesRoot,
          timeoutMs: 1000,
          maxStdoutBytes: 3,
          maxStderrBytes: 100,
        },
        new AbortController().signal
      )

      expect(result.stdout).toBe("abc")
      expect(result.stdoutTruncated).toBe(true)
    } finally {
      await rm(join(filesRoot, ".."), { recursive: true, force: true })
    }
  })

  it("marks timed-out commands and kills the child process", async () => {
    const filesRoot = await createFilesRoot()
    try {
      const result = await new LocalProcessSandboxBackend().execute(
        {
          workspaceId: "workspace_test",
          filesRoot,
          kind: "command",
          command: "node -e \"setTimeout(() => {}, 1000)\"",
          cwd: filesRoot,
          timeoutMs: 20,
          maxStdoutBytes: 100,
          maxStderrBytes: 100,
        },
        new AbortController().signal
      )

      expect(result.exitCode).toBeNull()
      expect(result.timedOut).toBe(true)
      expect(result.aborted).toBe(false)
    } finally {
      await rm(join(filesRoot, ".."), { recursive: true, force: true })
    }
  })
})
