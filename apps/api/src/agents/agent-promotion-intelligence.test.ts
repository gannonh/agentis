import { describe, expect, it } from "vitest"
import { buildDraftIntelligence } from "./agent-promotion-intelligence.js"

describe("agent promotion intelligence", () => {
  it("derives deterministic suggestions from source messages", () => {
    const intelligence = buildDraftIntelligence(
      { model: "gpt-4.1-mini" },
      [
        {
          id: "msg_user",
          threadId: "thread_test",
          role: "user",
          parts: [{ type: "text", text: "Triage issues, label severity." }],
          status: "completed",
          createdAt: new Date().toISOString(),
        },
        {
          id: "msg_assistant",
          threadId: "thread_test",
          role: "assistant",
          parts: [{ type: "text", text: "Inspect GitHub. Then draft replies." }],
          status: "completed",
          createdAt: new Date().toISOString(),
        },
      ],
      [{ toolkitSlug: "github", connectionId: "conn_github" }]
    )

    expect(intelligence).toMatchObject({
      suggestedPurpose: "Triage issues, label severity.",
      repeatedSteps: [
        "Triage issues",
        "label severity",
        "Inspect GitHub",
        "draft replies",
      ],
      requiredTools: [{ toolkitSlug: "github", connectionId: "conn_github" }],
      suggestedPrompt: "Use the source thread context to triage issues, label severity.",
      modelRecommendation: {
        model: "gpt-4.1-mini",
        reason: "Uses the model from the source thread.",
      },
    })
  })
})
