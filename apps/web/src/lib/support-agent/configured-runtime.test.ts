import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createConfiguredSupportAgentRuntime } from "./configured-runtime"

describe("configured support-agent runtime", () => {
  test("uses the model runtime when provider mode is selected", async () => {
    const generateText = vi.fn(async () => ({
      text: "A configured model answered this question.",
    }))
    const runtime = createConfiguredSupportAgentRuntime({
      mode: "model",
      provider: {
        provider: "openai",
        model: "gpt-4.1-mini",
        apiKey: "sk-runtime-test",
      },
      generateText,
    })

    const response = await runtime.respond(supportAgentChatRequestFixture)

    expect(generateText).toHaveBeenCalledTimes(1)
    expect(response.answer).toBe("A configured model answered this question.")
  })

  test("uses deterministic demo mode only when explicitly selected", async () => {
    const runtime = createConfiguredSupportAgentRuntime({
      mode: "demo",
    })

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).resolves.toMatchObject({
      answer: "Use Product documentation sample to answer: How do I connect a knowledge source?",
    })
  })
})
