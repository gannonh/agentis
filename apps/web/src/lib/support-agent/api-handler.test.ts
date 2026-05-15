import { describe, expect, test, vi } from "vitest"

import { createSupportAgentApiHandler } from "./api-handler"
import { supportAgentChatRequestFixture } from "./chat-fixtures"
import type { SupportAgentTextGenerator } from "./model-runtime"

describe("support-agent API handler", () => {
  test("calls the model runtime with server-side provider config", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config, prompt }) => ({
        text: `Live model saw ${config.provider}:${config.model} and ${prompt.includes("Product documentation sample") ? "selected docs" : "missing docs"}.`,
      })
    )
    const handler = createSupportAgentApiHandler({
      env: {
        OPENAI_API_KEY: "sk-test-secret",
        SUPPORT_AGENT_MODEL: "test-model",
      },
      generateText,
    })

    const response = await handler(
      new Request("http://localhost/api/support-agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportAgentChatRequestFixture),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          provider: "openai",
          model: "test-model",
          apiKey: "sk-test-secret",
        },
      })
    )
    expect(payload.answer).toContain("Live model saw openai:test-model")
    expect(payload.answer).toContain("selected docs")
    expect(payload.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "test-model",
    })
    expect(JSON.stringify(payload)).not.toContain("sk-test-secret")
  })

  test("does not expose raw non-runtime error messages", async () => {
    const handler = createSupportAgentApiHandler({
      env: {
        OPENAI_API_KEY: "sk-valid-test-key",
        SUPPORT_AGENT_MODEL: "test-model",
      },
      generateText: vi.fn<SupportAgentTextGenerator>(),
    })
    const request = new Request("http://localhost/api/support-agent/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supportAgentChatRequestFixture),
    })
    vi.spyOn(request, "json").mockRejectedValue(
      new Error("Provider exploded with sk-test-secret")
    )

    const response = await handler(request)
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error.message).toBe("Support agent request failed.")
    expect(JSON.stringify(payload)).not.toContain("sk-test-secret")
  })

  test("uses the default model when no model override is configured", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(async ({ config }) => ({
      text: `Default model ${config.model} handled the request.`,
    }))
    const handler = createSupportAgentApiHandler({
      env: { OPENAI_API_KEY: "sk-test-secret" },
      generateText,
    })

    const response = await handler(
      new Request("http://localhost/api/support-agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportAgentChatRequestFixture),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          provider: "openai",
          model: "gpt-4o-mini",
          apiKey: "sk-test-secret",
        }),
      })
    )
    expect(payload.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "gpt-4o-mini",
    })
  })

  test("returns a sanitized provider-config failure when the API key is missing", async () => {
    const handler = createSupportAgentApiHandler({
      env: { SUPPORT_AGENT_MODEL: "test-model" },
      generateText: vi.fn<SupportAgentTextGenerator>(),
    })

    const response = await handler(
      new Request("http://localhost/api/support-agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportAgentChatRequestFixture),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toEqual({
      error: {
        runtimeCode: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        title: "Provider configuration missing",
        userMessage:
          "The support agent needs provider credentials before it can answer.",
        maintainerMessage:
          "Set the support-agent provider environment variables, then retry the local demo.",
        message:
          "Support agent provider config requires provider, model, and API key.",
      },
    })
  })
})
