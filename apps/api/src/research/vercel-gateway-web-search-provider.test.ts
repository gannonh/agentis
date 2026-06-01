import { afterEach, describe, expect, it, vi } from "vitest"
import { generateText } from "ai"
import { loadConfig } from "../config.js"
import { createVercelGatewayWebSearchProvider } from "./vercel-gateway-web-search-provider.js"

const aiMocks = vi.hoisted(() => {
  const parallelSearch = vi.fn((input: unknown) => ({ provider: "parallel", input }))
  const perplexitySearch = vi.fn((input: unknown) => ({ provider: "perplexity", input }))
  const gateway = Object.assign(vi.fn((model: string) => ({ model })), {
    tools: { parallelSearch, perplexitySearch },
  })
  return { gateway, parallelSearch, perplexitySearch }
})

vi.mock("ai", () => ({
  createGateway: vi.fn(() => aiMocks.gateway),
  generateText: vi.fn(async () => ({
    toolResults: [
      {
        toolName: "parallel_search",
        output: {
          searchId: "parallel-request-1",
          results: [
            {
              title: "Parallel result",
              url: "https://example.com/parallel",
              excerpts: ["First excerpt", "Second excerpt"],
              publishDate: "2026-01-01",
            },
          ],
        },
      },
    ],
  })),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe("createVercelGatewayWebSearchProvider", () => {
  it("passes domain filters through to the Parallel backend", async () => {
    const provider = createVercelGatewayWebSearchProvider(
      loadConfig({
        AI_GATEWAY_API_KEY: "test-key",
        AGENTIS_WEB_SEARCH_BACKEND: "parallel",
      })
    )

    await provider.search({
      query: "agentis docs",
      domains: ["docs.agentis.dev"],
      maxResults: 3,
    })

    expect(aiMocks.parallelSearch).toHaveBeenCalledWith({
      maxResults: 3,
      searchDomainFilter: ["docs.agentis.dev"],
    })
  })

  it("rejects recency filters for the Parallel backend", async () => {
    const provider = createVercelGatewayWebSearchProvider(
      loadConfig({
        AI_GATEWAY_API_KEY: "test-key",
        AGENTIS_WEB_SEARCH_BACKEND: "parallel",
      })
    )

    await expect(
      provider.search({ query: "agentis news", recency: "week" })
    ).rejects.toMatchObject({
      code: "web_search_provider_unsupported",
      message: expect.stringContaining("recency"),
    })
  })

  it("maps Parallel excerpts into normalized snippets", async () => {
    const provider = createVercelGatewayWebSearchProvider(
      loadConfig({
        AI_GATEWAY_API_KEY: "test-key",
        AGENTIS_WEB_SEARCH_BACKEND: "parallel",
      })
    )

    const output = await provider.search({ query: "agentis docs" })

    expect(output.results[0]?.snippet).toBe("First excerpt\n\nSecond excerpt")
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.objectContaining({ parallel_search: expect.any(Object) }),
      })
    )
  })
})
