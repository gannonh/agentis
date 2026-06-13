import { describe, expect, it } from "vitest"
import { buildSuggestionChips } from "./suggestion-chips"

describe("buildSuggestionChips", () => {
  it("returns static chips when no agents have prompts", () => {
    const chips = buildSuggestionChips([])

    expect(chips.length).toBeGreaterThanOrEqual(4)
    expect(chips.some((chip) => chip.label === "Research a topic")).toBe(true)
  })

  it("prefers agent catalog prompts and dedupes by prompt text", () => {
    const chips = buildSuggestionChips([
      {
        id: "agent_launch",
        name: "Launch PM Copilot",
        description: "Launch updates",
        model: "openai/gpt-4o-mini",
        toolGrantCount: 0,
        createdAt: "2026-06-10T12:00:00.000Z",
        updatedAt: "2026-06-10T12:00:00.000Z",
        sourceWorkflow: {
          summary: "Weekly launch readiness report",
          firstUserPrompt:
            "Prepare a launch readiness update with owners, risks, and decisions for the current workspace.",
        },
      },
    ])

    expect(chips[0]?.agentId).toBe("agent_launch")
    expect(chips.some((chip) => chip.id === "launch-readiness")).toBe(false)
  })
})
