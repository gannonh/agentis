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
  it("maps source tool calls to required proposed grants", () => {
    const result = analyzeThreadToolUsage({
      steps: [
        step({
          type: "tool-call",
          title: "Create GitHub issue",
          payload: { toolName: "GITHUB_CREATE_ISSUE" },
        }),
        step({
          type: "tool-result",
          title: "Send Slack update",
          payload: { toolName: "SLACK_SEND_MESSAGE" },
        }),
      ],
      connectedToolkitSlugs: ["github"],
    })

    expect(result.proposedToolGrants).toMatchObject([
      {
        toolkitSlug: "github",
        toolName: "GITHUB_CREATE_ISSUE",
        required: true,
        validationStatus: "valid",
      },
      {
        toolkitSlug: "slack",
        toolName: "SLACK_SEND_MESSAGE",
        required: true,
        validationStatus: "missing_access",
        remediation: {
          code: "toolkit_not_connected",
          message: "Connect Slack before creating this agent.",
        },
      },
    ])
    expect(result.unsupportedSourceSteps).toEqual([])
  })

  it("records unsupported and incomplete source steps", () => {
    const result = analyzeThreadToolUsage({
      steps: [
        step({
          id: "step-crm",
          type: "tool-call",
          status: "completed",
          title: "Lookup CRM account",
          payload: { toolName: "CRM_LOOKUP" },
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
          payload: { toolName: "GITHUB_CREATE_ISSUE" },
        }),
      ],
      connectedToolkitSlugs: [],
    })

    expect(result.proposedToolGrants).toEqual([
      {
        toolkitSlug: "github",
        toolName: "GITHUB_CREATE_ISSUE",
        displayName: "GitHub create issue",
        required: true,
        validationStatus: "missing_access",
        remediation: {
          code: "toolkit_not_connected",
          message: "Connect GitHub before creating this agent.",
        },
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
      connectedToolkitSlugs: [],
    })

    expect(result).toEqual({ proposedToolGrants: [], unsupportedSourceSteps: [] })
  })
})
