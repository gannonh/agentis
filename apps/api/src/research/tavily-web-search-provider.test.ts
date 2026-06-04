import { afterEach, describe, expect, it, vi } from "vitest"
import { loadConfig } from "../config.js"
import { createTavilyWebSearchProvider } from "./tavily-web-search-provider.js"
import { WebSearchService } from "./web-search-service.js"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createTavilyWebSearchProvider", () => {
  it("uses keyless Tavily search and normalizes results", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        request_id: "request-1",
        usage: { credits: 1 },
        results: [
          {
            title: "Tavily result",
            url: "https://example.com/tavily",
            content: "Search result content for agents.",
            score: 0.8,
          },
        ],
      })
    )
    vi.stubGlobal("fetch", fetch)

    const provider = createTavilyWebSearchProvider(
      loadConfig({
        AGENTIS_WEB_SEARCH_PROVIDER: "tavily",
        AGENTIS_WEB_SEARCH_BACKEND: "keyless",
      })
    )

    const output = await provider.search({ query: " agent search ", maxResults: 3 })

    expect(fetch).toHaveBeenCalledWith("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tavily-Access-Mode": "keyless",
      },
      body: JSON.stringify({
        query: "agent search",
        max_results: 3,
        search_depth: "basic",
      }),
    })
    expect(output).toMatchObject({
      query: "agent search",
      provider: "tavily:keyless",
      resultCount: 1,
      metadata: { requestId: "request-1", credits: 1 },
      results: [
        {
          title: "Tavily result",
          url: "https://example.com/tavily",
          snippet: "Search result content for agents.",
          source: "example.com",
        },
      ],
    })
  })

  it("fails loudly for unsupported Tavily backends", async () => {
    const provider = createTavilyWebSearchProvider(
      loadConfig({
        AGENTIS_WEB_SEARCH_PROVIDER: "tavily",
        AGENTIS_WEB_SEARCH_BACKEND: "parallel",
      })
    )

    await expect(provider.search({ query: "agent search" })).rejects.toMatchObject({
      code: "web_search_provider_unsupported",
      message: expect.stringContaining("keyless"),
    })
  })

  it("maps Tavily HTTP failures to web search errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "rate limited" }, 429))
    )
    const provider = createTavilyWebSearchProvider(
      loadConfig({
        AGENTIS_WEB_SEARCH_PROVIDER: "tavily",
        AGENTIS_WEB_SEARCH_BACKEND: "keyless",
      })
    )

    await expect(provider.search({ query: "agent search" })).rejects.toMatchObject({
      code: "web_search_failed",
      message: expect.stringContaining("rate limited"),
    })
  })
})

describe("WebSearchService Tavily resolution", () => {
  it("resolves Tavily keyless provider when configured", () => {
    const service = new WebSearchService(
      loadConfig({
        AGENTIS_WEB_SEARCH_PROVIDER: "tavily",
        AGENTIS_WEB_SEARCH_BACKEND: "keyless",
      })
    )

    expect(service.isAvailable()).toBe(true)
    expect(service.getProviderName()).toBe("tavily")
    expect(service.resolveProvider().name).toBe("tavily:keyless")
  })
})
