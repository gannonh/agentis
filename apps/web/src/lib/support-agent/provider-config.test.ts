import { describe, expect, test } from "vitest"

import {
  resolveSupportAgentProviderConfig,
  toPublicSupportAgentProviderConfig,
} from "./provider-config"

describe("support-agent provider config", () => {
  test("accepts complete local provider config so the runtime can call a model", () => {
    const result = resolveSupportAgentProviderConfig({
      provider: "openai",
      model: "gpt-5.4-mini",
      apiKey: "sk-local-test",
    })

    expect(result).toEqual({
      ok: true,
      config: {
        provider: "openai",
        model: "gpt-5.4-mini",
        apiKey: "sk-local-test",
      },
    })
  })

  test("fails clearly when provider config is missing", () => {
    expect(resolveSupportAgentProviderConfig({})).toEqual({
      ok: false,
      error: {
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Support agent provider config requires provider, model, and API key.",
        missingFields: ["provider", "model", "apiKey"],
      },
    })
  })

  test("rejects unsupported providers before a model call is attempted", () => {
    expect(
      resolveSupportAgentProviderConfig({
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        apiKey: "sk-local-test",
      })
    ).toEqual({
      ok: false,
      error: {
        code: "SUPPORT_AGENT_PROVIDER_UNSUPPORTED",
        message: "Support agent provider must be openai.",
        provider: "anthropic",
      },
    })
  })

  test("omits API keys from public provider config", () => {
    const result = resolveSupportAgentProviderConfig({
      provider: "openai",
      model: "gpt-5.4-mini",
      apiKey: "sk-secret-value",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error("Expected provider config to resolve")
    }

    const publicConfig = toPublicSupportAgentProviderConfig(result.config)

    expect(publicConfig).toEqual({
      provider: "openai",
      model: "gpt-5.4-mini",
      hasApiKey: true,
    })
    expect(JSON.stringify(publicConfig)).not.toContain("sk-secret-value")
  })
})
