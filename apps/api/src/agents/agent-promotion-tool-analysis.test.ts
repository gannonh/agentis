import { describe, expect, it } from "vitest"
import type { RunStep } from "@workspace/shared"
import { analyzeThreadToolUsage } from "./agent-promotion-tool-analysis.js"

const now = new Date().toISOString()

function step(input: Partial<RunStep> & Pick<RunStep, "type" | "title">): RunStep {
  return {
    id: input.id ?? `step-${input.title}`,
    runId: input.runId ?? "run-1",
    type: input.type,
    status: input.status ?? "completed",
    title: input.title,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  }
}

describe("agent promotion tool analysis", () => {
  it("maps runtime tool step payloads to required proposed grants", () => {
    const result = analyzeThreadToolUsage({
      steps: [
        step({
          type: "tool-call",
          title: "Create GitHub issue",
          payload: {
            toolkitSlug: "github",
            toolSlug: "GITHUB_CREATE_ISSUE",
          },
        }),
        step({
          type: "tool-result",
          title: "Send Slack update",
          payload: {
            toolkitSlug: "slack",
            toolSlug: "SLACK_SEND_MESSAGE",
          },
        }),
      ],
    })

    expect(result.proposedToolGrants).toMatchObject([
      {
        toolkitSlug: "github",
        toolName: "GITHUB_CREATE_ISSUE",
        required: true,
      },
      {
        toolkitSlug: "slack",
        toolName: "SLACK_SEND_MESSAGE",
        required: true,
      },
    ])
    expect(result.unsupportedSourceSteps).toEqual([])
  })

  it("falls back to legacy raw tool metadata", () => {
    const result = analyzeThreadToolUsage({
      steps: [
        step({
          type: "tool-call",
          title: "List Google Drive files",
          payload: { toolName: "GOOGLE_DRIVE_LIST_FILES" },
        }),
        step({
          type: "tool-call",
          title: "Call legacy Slack tool",
          payload: { tool: "SLACK_SEND_MESSAGE" },
        }),
      ],
    })

    expect(result.proposedToolGrants).toMatchObject([
      {
        toolkitSlug: "google-drive",
        toolName: "GOOGLE_DRIVE_LIST_FILES",
        displayName: "Google Drive list files",
      },
      {
        toolkitSlug: "slack",
        toolName: "SLACK_SEND_MESSAGE",
        displayName: "Slack send message",
      },
    ])
  })

  it("records unsupported and incomplete source steps", () => {
    const result = analyzeThreadToolUsage({
      steps: [
        step({
          id: "step-crm",
          type: "tool-call",
          status: "completed",
          title: "Lookup CRM account",
          payload: { toolkitSlug: "crm", toolSlug: "CRM_LOOKUP" },
        }),
        step({
          id: "step-missing",
          type: "tool-call",
          status: "completed",
          title: "Unnamed tool call",
          payload: { input: { query: "support" } },
        }),
        step({
          id: "step-failed",
          type: "tool-result",
          status: "failed",
          title: "GitHub create issue failed",
          payload: {
            toolkitSlug: "github",
            toolSlug: "GITHUB_CREATE_ISSUE",
          },
        }),
      ],
    })

    expect(result.proposedToolGrants).toEqual([
      {
        toolkitSlug: "github",
        toolName: "GITHUB_CREATE_ISSUE",
        displayName: "GitHub create issue",
        required: true,
      },
    ])
    expect(result.unsupportedSourceSteps).toMatchObject([
      {
        id: "step-crm",
        title: "Lookup CRM account",
        reason: "unsupported_tool",
        toolName: "CRM_LOOKUP",
      },
      {
        id: "step-missing",
        title: "Unnamed tool call",
        reason: "missing_metadata",
      },
      {
        id: "step-failed",
        title: "GitHub create issue failed",
        reason: "incomplete_tool_call",
        toolName: "GITHUB_CREATE_ISSUE",
      },
    ])
  })

  it("keeps no-tool threads quiet", () => {
    const result = analyzeThreadToolUsage({
      steps: [step({ type: "reasoning", title: "Reason about the request" })],
    })

    expect(result).toEqual({ proposedToolGrants: [], unsupportedSourceSteps: [] })
  })
})
