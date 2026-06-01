import { describe, expect, it } from "vitest"
import {
  isWebSearchProviderAvailable,
  loadConfig,
  resolveWebSearchProviderName,
} from "./config.js"

describe("web search config", () => {
  it("defaults to gateway perplexity search with conservative limits", () => {
    const config = loadConfig({})

    expect(config.webSearchProvider).toBe("vercel-gateway")
    expect(config.webSearchBackend).toBe("perplexity")
    expect(config.webSearchMaxResults).toBe(5)
    expect(config.webSearchMaxSnippetChars).toBe(500)
  })

  it("clamps configured limits to hard caps", () => {
    const config = loadConfig({
      AGENTIS_WEB_SEARCH_MAX_RESULTS: "99",
      AGENTIS_WEB_SEARCH_MAX_SNIPPET_CHARS: "5000",
    })

    expect(config.webSearchMaxResults).toBe(10)
    expect(config.webSearchMaxSnippetChars).toBe(1000)
  })

  it("uses mock provider availability when mock runtime is enabled", () => {
    const config = loadConfig({
      AGENTIS_MOCK_RUNTIME: "1",
      AGENTIS_WEB_SEARCH_PROVIDER: "vercel-gateway",
    })

    expect(resolveWebSearchProviderName(config)).toBe("mock")
    expect(isWebSearchProviderAvailable(config)).toBe(true)
  })

  it("requires gateway credentials for non-mock gateway search", () => {
    const unavailable = loadConfig({
      AGENTIS_WEB_SEARCH_PROVIDER: "vercel-gateway",
    })
    const available = loadConfig({
      AGENTIS_WEB_SEARCH_PROVIDER: "vercel-gateway",
      AI_GATEWAY_API_KEY: "gateway-key",
    })

    expect(isWebSearchProviderAvailable(unavailable)).toBe(false)
    expect(isWebSearchProviderAvailable(available)).toBe(true)
  })
})
