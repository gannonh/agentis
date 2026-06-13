import { afterEach, describe, expect, it, vi } from "vitest"
import { transformCloudflareOpenAiChatRequestBody } from "./cloudflare-ai-gateway.js"
import {
  createGatewayLanguageModel,
  prepareGatewayStreamPrompt,
  resolveGatewayModelId,
} from "./gateway-model.js"
import { loadConfig } from "../config.js"

const aiMocks = vi.hoisted(() => {
  const gateway = vi.fn((modelId: string) => ({ provider: "gateway", modelId }))
  const cloudflare = vi.fn((modelId: string) => ({
    provider: "cloudflare",
    modelId,
  }))
  const anthropic = vi.fn((modelId: string) => ({
    provider: "anthropic",
    modelId,
  }))
  const createGateway = vi.fn(() => gateway)
  const createOpenAICompatible = vi.fn(() => cloudflare)
  const createAnthropic = vi.fn(() => anthropic)
  return {
    createGateway,
    createOpenAICompatible,
    createAnthropic,
    gateway,
    cloudflare,
    anthropic,
  }
})

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>()
  return {
    ...actual,
    createGateway: aiMocks.createGateway,
  }
})

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: aiMocks.createOpenAICompatible,
}))

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: aiMocks.createAnthropic,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe("Gateway model resolution", () => {
  it("keeps valid Gateway model ids unchanged", () => {
    expect(resolveGatewayModelId("openai/gpt-5.4-mini")).toBe(
      "openai/gpt-5.4-mini"
    )
    expect(resolveGatewayModelId("anthropic/claude-sonnet-4.6")).toBe(
      "anthropic/claude-sonnet-4.6"
    )
  })

  it("keeps Workers AI model ids unchanged", () => {
    expect(resolveGatewayModelId("@cf/moonshotai/kimi-k2.6")).toBe(
      "@cf/moonshotai/kimi-k2.6"
    )
    expect(resolveGatewayModelId("@cf/zai-org/glm-4.7-flash")).toBe(
      "@cf/zai-org/glm-4.7-flash"
    )
  })

  it("rejects Workers AI model ids with extra path segments", () => {
    expect(() => resolveGatewayModelId("@cf/a/b/c")).toThrow(
      "Workers AI model ids must use @cf/author/model format"
    )
  })

  it("rejects malformed prefixed Gateway model ids", () => {
    for (const modelId of [
      "openai/",
      "/gpt-4o-mini",
      "openai/gpt-4o-mini/extra",
    ]) {
      expect(() => resolveGatewayModelId(modelId)).toThrow(
        "Gateway model ids must use provider/model format"
      )
    }
  })

  it("maps legacy OpenAI model ids to Gateway ids", () => {
    expect(resolveGatewayModelId("gpt-4o-mini")).toBe("openai/gpt-4o-mini")
    expect(resolveGatewayModelId("gpt-4.1-mini")).toBe("openai/gpt-4.1-mini")
    expect(resolveGatewayModelId("gpt-4o")).toBe("openai/gpt-4o")
    expect(resolveGatewayModelId("gpt-4")).toBe("openai/gpt-4")
    expect(resolveGatewayModelId("gpt-3.5-turbo")).toBe(
      "openai/gpt-3.5-turbo"
    )
  })

  it("rejects empty model ids", () => {
    expect(() => resolveGatewayModelId("   ")).toThrow("Model id is required")
  })

  it("rejects unsupported unprefixed model ids", () => {
    expect(() => resolveGatewayModelId("claude-sonnet-4")).toThrow(
      "Gateway model ids must include a provider prefix"
    )
  })

  it("creates Vercel Gateway language models with the selected credential", () => {
    const model = createGatewayLanguageModel(
      loadConfig({
        AI_GATEWAY_PROVIDER: "vercel",
        VERCEL_AI_GATEWAY_API_KEY: "vercel-key",
      }),
      "gpt-4o-mini"
    )

    expect(aiMocks.createGateway).toHaveBeenCalledWith({
      apiKey: "vercel-key",
    })
    expect(aiMocks.gateway).toHaveBeenCalledWith("openai/gpt-4o-mini")
    expect(model).toEqual({
      provider: "gateway",
      modelId: "openai/gpt-4o-mini",
    })
  })

  it("creates Cloudflare Anthropic models through the native Messages API", () => {
    const model = createGatewayLanguageModel(
      loadConfig({
        AI_GATEWAY_PROVIDER: "cloudflare",
        CLOUDFLARE_API_KEY: "cloudflare-key",
        CLOUDFLARE_ACCOUNT_ID: "account-id",
        CLOUDFLARE_AI_GATEWAY_ID: "default",
      }),
      "anthropic/claude-sonnet-4.6"
    )

    expect(aiMocks.createAnthropic).toHaveBeenCalledWith({
      apiKey: "cloudflare-key",
      baseURL:
        "https://api.cloudflare.com/client/v4/accounts/account-id/ai/v1",
      headers: {
        Authorization: "Bearer cloudflare-key",
        "cf-aig-gateway-id": "default",
      },
    })
    expect(aiMocks.anthropic).toHaveBeenCalledWith("anthropic/claude-sonnet-4.6")
    expect(aiMocks.createOpenAICompatible).not.toHaveBeenCalled()
    expect(model).toEqual({
      provider: "anthropic",
      modelId: "anthropic/claude-sonnet-4.6",
    })
  })

  it("creates Cloudflare OpenAI-schema models with chat/completions transforms", () => {
    const model = createGatewayLanguageModel(
      loadConfig({
        AI_GATEWAY_PROVIDER: "cloudflare",
        CLOUDFLARE_API_KEY: "cloudflare-key",
        CLOUDFLARE_ACCOUNT_ID: "account-id",
        CLOUDFLARE_AI_GATEWAY_ID: "default",
      }),
      "openai/gpt-4o-mini"
    )

    expect(aiMocks.createOpenAICompatible).toHaveBeenCalledWith({
      name: "cloudflare-ai-gateway",
      apiKey: "cloudflare-key",
      baseURL:
        "https://api.cloudflare.com/client/v4/accounts/account-id/ai/v1",
      headers: { "cf-aig-gateway-id": "default" },
      transformRequestBody: transformCloudflareOpenAiChatRequestBody,
    })
    expect(aiMocks.cloudflare).toHaveBeenCalledWith("openai/gpt-4o-mini")
    expect(model).toEqual({
      provider: "cloudflare",
      modelId: "openai/gpt-4o-mini",
    })
  })

  it("defaults Workers AI gateway headers when gateway id is unset", () => {
    createGatewayLanguageModel(
      loadConfig({
        AI_GATEWAY_PROVIDER: "cloudflare",
        CLOUDFLARE_API_KEY: "cloudflare-key",
        CLOUDFLARE_ACCOUNT_ID: "account-id",
      }),
      "@cf/moonshotai/kimi-k2.6"
    )

    expect(aiMocks.createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "cf-aig-gateway-id": "default" },
      })
    )
  })

  it("fails loudly when selected Gateway credentials are missing", () => {
    expect(() =>
      createGatewayLanguageModel(loadConfig({}), "openai/gpt-4o-mini")
    ).toThrow("VERCEL_AI_GATEWAY_API_KEY is not configured")
    expect(() =>
      createGatewayLanguageModel(
        loadConfig({ AI_GATEWAY_PROVIDER: "cloudflare" }),
        "openai/gpt-4o-mini"
      )
    ).toThrow("CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID are not configured")
  })
})

describe("prepareGatewayStreamPrompt", () => {
  it("inlines system instructions for Cloudflare Anthropic models", () => {
    const prepared = prepareGatewayStreamPrompt({
      config: loadConfig({ AI_GATEWAY_PROVIDER: "cloudflare" }),
      modelId: "anthropic/claude-sonnet-4.6",
      system: "You are Agentis.",
      messages: [{ role: "user", content: "Say hello." }],
    })

    expect(prepared.system).toBeUndefined()
    expect(prepared.messages).toEqual([
      { role: "user", content: "You are Agentis.\n\nSay hello." },
    ])
  })

  it("keeps the system field for other gateway models", () => {
    const prepared = prepareGatewayStreamPrompt({
      config: loadConfig({ AI_GATEWAY_PROVIDER: "cloudflare" }),
      modelId: "openai/gpt-5.4-mini",
      system: "You are Agentis.",
      messages: [{ role: "user", content: "Say hello." }],
    })

    expect(prepared.system).toBe("You are Agentis.")
    expect(prepared.messages).toEqual([{ role: "user", content: "Say hello." }])
  })
})
