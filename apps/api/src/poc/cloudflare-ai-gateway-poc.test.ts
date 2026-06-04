import { describe, expect, it } from "vitest"
import {
  assertCloudflareChatStreamResult,
  buildCloudflareAiGatewayBaseUrl,
  buildCloudflareAiGatewayHeaders,
  buildCloudflareSearchPrompt,
  buildTavilyKeylessHeaders,
  extractJsonObject,
  loadCloudflarePocConfig,
  normalizeCloudflareSearchPayload,
  normalizeTavilySearchResponse,
} from "./cloudflare-ai-gateway-poc.js"

describe("Cloudflare AI Gateway POC config", () => {
  it("requires the Cloudflare API key and account id before live calls", () => {
    const result = loadCloudflarePocConfig({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual([
        "CLOUDFLARE_API_KEY",
        "CLOUDFLARE_ACCOUNT_ID",
      ])
    }
  })

  it("uses the account-scoped Cloudflare AI REST base URL", () => {
    expect(buildCloudflareAiGatewayBaseUrl("account-123")).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-123/ai/v1"
    )
  })

  it("passes the optional gateway id through Cloudflare headers", () => {
    expect(buildCloudflareAiGatewayHeaders("dev-gateway")).toEqual({
      "cf-aig-gateway-id": "dev-gateway",
    })
  })

  it("reads the same gateway id env var as the main config", () => {
    const result = loadCloudflarePocConfig({
      CLOUDFLARE_API_KEY: "cloudflare-key",
      CLOUDFLARE_ACCOUNT_ID: "account-id",
      CLOUDFLARE_AI_GATEWAY_ID: "prod-gateway",
      CLOUDFLARE_GATEWAY_ID: "legacy-gateway",
      CLOUDFLARE_GATEWAY_NAME: "legacy-name",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.gatewayId).toBe("prod-gateway")
    }
  })

  it("rejects empty chat streams as blocked POC evidence", () => {
    expect(() =>
      assertCloudflareChatStreamResult({ text: "", chunks: 0 })
    ).toThrow("Cloudflare chat stream produced no text")
  })
})

describe("Cloudflare search POC normalization", () => {
  it("asks search-capable models for SearchWebOutput-compatible JSON", () => {
    const prompt = buildCloudflareSearchPrompt("cloudflare ai gateway")

    expect(prompt).toContain("cloudflare ai gateway")
    expect(prompt).toContain("results")
    expect(prompt).toContain("title")
    expect(prompt).toContain("url")
    expect(prompt).toContain("snippet")
  })

  it("extracts a JSON object from model text with markdown fences", () => {
    expect(
      extractJsonObject('```json\n{"results":[{"title":"A","url":"https://a.test"}]}\n```')
    ).toEqual({ results: [{ title: "A", url: "https://a.test" }] })
  })

  it("maps result-like Cloudflare search payloads into SearchWebOutput", () => {
    const output = normalizeCloudflareSearchPayload({
      query: "cloudflare ai gateway",
      provider: "cloudflare:perplexity",
      payload: {
        results: [
          {
            title: "Cloudflare AI Gateway docs",
            url: "https://developers.cloudflare.com/ai-gateway/",
            snippet: "Gateway docs",
            publishedAt: "2026-06-01",
          },
        ],
      },
    })

    expect(output).toMatchObject({
      query: "cloudflare ai gateway",
      provider: "cloudflare:perplexity",
      results: [
        {
          title: "Cloudflare AI Gateway docs",
          url: "https://developers.cloudflare.com/ai-gateway/",
          snippet: "Gateway docs",
          publishedAt: "2026-06-01",
        },
      ],
    })
  })

  it("uses Tavily keyless mode without an API credential", () => {
    expect(buildTavilyKeylessHeaders()).toEqual({
      "Content-Type": "application/json",
      "X-Tavily-Access-Mode": "keyless",
    })
  })

  it("maps Tavily keyless results into SearchWebOutput", () => {
    const output = normalizeTavilySearchResponse({
      query: "agent search",
      payload: {
        results: [
          {
            title: "Agent search example",
            url: "https://example.com/agent-search",
            content: "Search result content optimized for LLMs.",
            score: 0.9,
          },
        ],
        request_id: "request-1",
        usage: { credits: 1 },
      },
    })

    expect(output).toMatchObject({
      query: "agent search",
      provider: "tavily:keyless",
      resultCount: 1,
      metadata: { requestId: "request-1", credits: 1 },
      results: [
        {
          title: "Agent search example",
          url: "https://example.com/agent-search",
          snippet: "Search result content optimized for LLMs.",
        },
      ],
    })
  })
})
