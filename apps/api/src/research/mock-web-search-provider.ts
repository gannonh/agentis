import type { SearchWebInput, SearchWebOutput } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import {
  boundSearchInput,
  normalizeSearchResults,
} from "./web-search-normalize.js"
import type { WebSearchProvider } from "./web-search-provider.js"

export function createMockWebSearchProvider(
  config: AppConfig
): WebSearchProvider {
  return {
    name: "mock",
    async search(input: SearchWebInput): Promise<SearchWebOutput> {
      const bounded = boundSearchInput(input, config)
      const maxResults = bounded.maxResults ?? config.webSearchMaxResults
      const rawResults = Array.from({ length: maxResults }, (_, index) => ({
        title: `Mock result ${index + 1} for ${bounded.query}`,
        url: `https://example.com/mock/${index + 1}?q=${encodeURIComponent(bounded.query)}`,
        snippet: `Mock snippet ${index + 1} describing current information about ${bounded.query}.`,
        source: "example.com",
        publishedAt: "2026-05-31",
      }))

      return normalizeSearchResults({
        query: bounded.query,
        provider: "mock",
        rawResults,
        maxResults,
        maxSnippetChars: config.webSearchMaxSnippetChars,
        metadata: { mode: "mock" },
      })
    },
  }
}
