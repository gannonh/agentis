import { describe, expect, it } from "vitest"
import { loadConfig } from "../config.js"
import {
  buildCloudflareRestHeaders,
  gatewayModelName,
  gatewayModelProvider,
  isOpenAiReasoningEraModel,
  resolveCloudflareGatewayId,
  resolveCloudflareLlmTransport,
  transformCloudflareOpenAiChatRequestBody,
} from "./cloudflare-ai-gateway.js"

describe("Cloudflare AI Gateway transport routing", () => {
  it("routes models by provider prefix per Cloudflare REST API docs", () => {
    expect(resolveCloudflareLlmTransport("anthropic/claude-sonnet-4.6")).toBe(
      "anthropic-messages"
    )
    expect(resolveCloudflareLlmTransport("openai/gpt-5.4-mini")).toBe(
      "openai-chat-completions"
    )
    expect(resolveCloudflareLlmTransport("google/gemini-3-flash")).toBe(
      "openai-chat-completions"
    )
    expect(resolveCloudflareLlmTransport("@cf/moonshotai/kimi-k2.6")).toBe(
      "workers-ai-chat-completions"
    )
  })

  it("defaults Workers AI gateway id when unset", () => {
    const config = loadConfig({
      AI_GATEWAY_PROVIDER: "cloudflare",
      CLOUDFLARE_API_KEY: "key",
      CLOUDFLARE_ACCOUNT_ID: "account",
    })
    expect(
      resolveCloudflareGatewayId(config, "@cf/moonshotai/kimi-k2.6")
    ).toBe("default")
    expect(resolveCloudflareGatewayId(config, "openai/gpt-5.4-mini")).toBe(
      undefined
    )
    expect(
      buildCloudflareRestHeaders(config, "@cf/moonshotai/kimi-k2.6")
    ).toEqual({ "cf-aig-gateway-id": "default" })
  })

  it("uses configured gateway id for all transports", () => {
    const config = loadConfig({
      AI_GATEWAY_PROVIDER: "cloudflare",
      CLOUDFLARE_API_KEY: "key",
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_AI_GATEWAY_ID: "prod",
    })
    expect(
      buildCloudflareRestHeaders(config, "openai/gpt-5.4-mini")
    ).toEqual({ "cf-aig-gateway-id": "prod" })
  })
})

describe("Cloudflare OpenAI chat/completions transforms", () => {
  it("parses gateway model ids into provider and bare model name", () => {
    expect(gatewayModelProvider("openai/gpt-5.4-mini")).toBe("openai")
    expect(gatewayModelName("openai/gpt-5.4-mini")).toBe("gpt-5.4-mini")
    expect(gatewayModelProvider("@cf/moonshotai/kimi-k2.6")).toBe("workers-ai")
    expect(gatewayModelName("@cf/moonshotai/kimi-k2.6")).toBe(
      "moonshotai/kimi-k2.6"
    )
  })

  it("classifies OpenAI reasoning-era models from bare names", () => {
    expect(isOpenAiReasoningEraModel("gpt-5.4-mini")).toBe(true)
    expect(isOpenAiReasoningEraModel("o4-mini")).toBe(true)
    expect(isOpenAiReasoningEraModel("gpt-4o-mini")).toBe(false)
    expect(isOpenAiReasoningEraModel("gpt-5-chat-latest")).toBe(false)
  })

  it("rewrites max_tokens for OpenAI reasoning-era models only", () => {
    expect(
      transformCloudflareOpenAiChatRequestBody({
        model: "openai/gpt-5.4-mini",
        max_tokens: 8192,
        messages: [],
      })
    ).toEqual({
      model: "openai/gpt-5.4-mini",
      max_completion_tokens: 8192,
      messages: [],
    })
    expect(
      transformCloudflareOpenAiChatRequestBody({
        model: "openai/gpt-4o-mini",
        max_tokens: 8192,
        messages: [],
      })
    ).toEqual({
      model: "openai/gpt-4o-mini",
      max_tokens: 8192,
      messages: [],
    })
    expect(
      transformCloudflareOpenAiChatRequestBody({
        model: "google/gemini-3-flash",
        max_tokens: 8192,
        messages: [],
      })
    ).toEqual({
      model: "google/gemini-3-flash",
      max_tokens: 8192,
      messages: [],
    })
  })
})
