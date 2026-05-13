import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createConfiguredSupportAgentRuntime } from "./configured-runtime"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("configured support-agent runtime", () => {
  test("uses the model runtime when provider mode is selected", async () => {
    const generateText = vi.fn(async () => ({
      text: "A configured model answered this question.",
    }))
    const runtime = createConfiguredSupportAgentRuntime({
      mode: "model",
      provider: {
        provider: "openai",
        model: "gpt-5.4-mini",
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

  test("normalizes missing provider config before model calls", async () => {
    const generateText = vi.fn(async () => ({ text: "unused" }))
    const runtime = createConfiguredSupportAgentRuntime({
      mode: "model",
      provider: {},
      generateText,
    })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Support agent provider config requires provider, model, and API key.",
      })
    )
    expect(generateText).not.toHaveBeenCalled()
  })

  test("normalizes unsupported providers before model calls", async () => {
    const generateText = vi.fn(async () => ({ text: "unused" }))
    const runtime = createConfiguredSupportAgentRuntime({
      mode: "model",
      provider: {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        apiKey: "sk-runtime-test",
      },
      generateText,
    })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_UNSUPPORTED",
        message: "Support agent provider must be openai.",
      })
    )
    expect(generateText).not.toHaveBeenCalled()
  })
})
