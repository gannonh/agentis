import { describe, expect, it } from "vitest"
import { formatNativeToolRunStepPayload } from "./native-tool-payload.js"

describe("formatNativeToolRunStepPayload", () => {
  it("summarizes workspace execution output and approval metadata", () => {
    const payload = formatNativeToolRunStepPayload({
      toolCallId: "call_exec",
      toolName: "runWorkspaceCommand",
      workspaceId: "workspace_agentis",
      input: { kind: "command", command: "printf hello" },
      output: {
        workspaceId: "workspace_agentis",
        executionId: "wexec_1",
        kind: "command",
        exitCode: 0,
        durationMs: 12,
        stdout: "hello",
        stderr: "",
        stdoutTruncated: false,
        stderrTruncated: false,
        timedOut: false,
        aborted: false,
        changedFiles: [{ path: "out.txt", operation: "created" }],
      },
    })

    expect(payload).toMatchObject({
      provider: "native",
      toolName: "runWorkspaceCommand",
      changedFiles: [{ path: "out.txt", operation: "created" }],
      output: expect.objectContaining({
        executionId: "wexec_1",
        exitCode: 0,
        stdout: "hello",
      }),
    })
  })

  it("infers pending approval metadata for workspace executions", () => {
    const payload = formatNativeToolRunStepPayload({
      toolCallId: "call_exec",
      toolName: "runWorkspaceCommand",
      workspaceId: "workspace_agentis",
      input: { kind: "command", command: "printf hello" },
      output: {
        workspaceId: "workspace_agentis",
        executionId: "wexec_1",
        kind: "command",
        status: "pending_approval",
        changedFiles: [],
      },
    })

    expect(payload?.approval).toEqual({
      status: "pending",
      executionId: "wexec_1",
    })
  })
})
