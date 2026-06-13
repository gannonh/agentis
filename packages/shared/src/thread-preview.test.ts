import { describe, expect, it } from "vitest"
import {
  summarizeThreadPreview,
  threadListSummaryFromMessages,
} from "./thread-preview.js"

describe("thread-preview", () => {
  it("truncates long preview text", () => {
    const longText = "a".repeat(200)
    expect(summarizeThreadPreview(longText)).toHaveLength(160)
    expect(summarizeThreadPreview(longText).endsWith("...")).toBe(true)
  })

  it("prefers the last assistant message over earlier user text", () => {
    const summary = threadListSummaryFromMessages([
      {
        role: "user",
        parts: [{ type: "text", text: "Prepare a launch readiness update." }],
      },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Launch readiness is on track with two blockers to resolve.",
          },
        ],
      },
    ])

    expect(summary).toBe(
      "Launch readiness is on track with two blockers to resolve."
    )
  })

  it("falls back to the last user message when no assistant text exists", () => {
    const summary = threadListSummaryFromMessages([
      {
        role: "user",
        parts: [{ type: "text", text: "Triage these support escalations." }],
      },
    ])

    expect(summary).toBe("Triage these support escalations.")
  })

  it("suppresses raw tool provider JSON in assistant previews", () => {
    const summary = threadListSummaryFromMessages([
      {
        role: "user",
        parts: [{ type: "text", text: "Search for AI agent adoption trends." }],
      },
      {
        role: "assistant",
        parts: [
          {
            type: "tool-result",
            toolCallId: "call_1",
            toolName: "searchWeb",
            output: { query: "ai agents", provider: "mock", results: [] },
          },
          {
            type: "text",
            text: '{"query":"ai agents","provider":"mock","results":[]}',
          },
        ],
      },
    ])

    expect(summary).toBe("Search for AI agent adoption trends.")
  })

  it("returns null when no visible text exists", () => {
    expect(threadListSummaryFromMessages([])).toBeNull()
  })
})
