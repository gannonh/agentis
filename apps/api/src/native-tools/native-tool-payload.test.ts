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
      input: expect.objectContaining({
        command: "[REDACTED]",
        commandLength: 12,
        commandSha256:
          "2189aff6492b39e6aa62f939b98cbc0cfaa1392da9df3a5ef73a7b0b369119d3",
      }),
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

  it("redacts script bodies while preserving metadata", () => {
    const payload = formatNativeToolRunStepPayload({
      toolCallId: "call_exec",
      toolName: "runWorkspaceCommand",
      workspaceId: "workspace_agentis",
      input: { kind: "script", language: "node", code: "console.log('secret')" },
      output: {
        workspaceId: "workspace_agentis",
        executionId: "wexec_1",
        kind: "script",
        status: "pending_approval",
        changedFiles: [],
      },
    })

    expect(payload?.input).toMatchObject({
      kind: "script",
      language: "node",
      code: "[REDACTED]",
      codeLength: 21,
      codeSha256:
        "d7a53897ed8cf81ed82725b181df666b7e1e78f749b23febbc6b8043c652f648",
    })
  })
})
