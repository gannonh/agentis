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

  it("bounds persisted native web search evidence", () => {
    const payload = formatNativeToolRunStepPayload({
      toolCallId: "call_search",
      toolName: "searchWeb",
      input: {
        query: "latest ai news",
        domains: Array.from({ length: 12 }, (_, index) => `example${index}.com`),
      },
      output: {
        query: "latest ai news",
        provider: "mock",
        resultCount: 1,
        truncated: false,
        results: [
          {
            title: "x".repeat(600),
            url: `https://example.com/${"a".repeat(600)}`,
            snippet: "s".repeat(900),
            source: "source".repeat(200),
            publishedAt: "2026-01-01",
          },
        ],
        metadata: {
          requestId: "request-1",
          rawResponse: "x".repeat(10_000),
        },
      },
    })

    const input = payload?.input as { domains?: string[] }
    const output = payload?.output as {
      results: Array<{
        title: string
        url: string
        snippet?: string
        source?: string
      }>
      metadata?: Record<string, unknown>
    }

    expect(input.domains).toHaveLength(10)
    expect(output.results[0]?.title).toHaveLength(200)
    expect(output.results[0]?.url).toHaveLength(500)
    expect(output.results[0]?.snippet).toHaveLength(500)
    expect(output.results[0]?.source).toHaveLength(200)
    expect(output.metadata).toEqual({ requestId: "request-1" })
  })

  it("bounds static artifact timeline payloads without HTML or images", () => {
    const payload = formatNativeToolRunStepPayload({
      toolCallId: "call_static",
      toolName: "createStaticArtifact",
      input: {
        title: "x".repeat(400),
        artifactType: "slides",
        renderMode: "html",
        contentBrief: "<html>" + "secret".repeat(1000),
        sourceData: "raw".repeat(1000),
      },
      output: {
        action: "created",
        artifactId: "artifact_1",
        title: "Launch deck",
        artifactType: "slides",
        renderMode: "html",
        version: 1,
        theme: "keynote",
        slideCount: 2,
        viewPath: "/artifacts/artifact_1",
        html: "<html>should not persist</html>",
        images: ["data:image/png;base64,abc"],
      },
    })

    expect(payload).toMatchObject({
      provider: "native",
      toolName: "createStaticArtifact",
      input: {
        title: expect.any(String),
        artifactType: "slides",
        renderMode: "html",
      },
      output: {
        action: "created",
        artifactId: "artifact_1",
        title: "Launch deck",
        artifactType: "slides",
        renderMode: "html",
        version: 1,
        theme: "keynote",
        slideCount: 2,
        viewPath: "/artifacts/artifact_1",
      },
    })
    expect(JSON.stringify(payload)).not.toContain("<html>")
    expect(JSON.stringify(payload)).not.toContain("data:image")
  })
})
