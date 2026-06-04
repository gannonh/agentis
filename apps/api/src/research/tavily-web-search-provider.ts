import type { SearchWebInput } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import {
  boundSearchInput,
  normalizeSearchResults,
} from "./web-search-normalize.js"
import {
  WebSearchError,
  type WebSearchProvider,
} from "./web-search-provider.js"

type TavilySearchResponse = {
  request_id?: string
  response_time?: string
  usage?: { credits?: number }
  results?: Array<{
    title?: string
    url?: string
    content?: string
    score?: number
  }>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readErrorMessage(payload: unknown): string | undefined {
  if (!isObject(payload)) return undefined
  const message = payload.error ?? payload.message ?? payload.detail
  return typeof message === "string" && message.trim() ? message : undefined
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function mapTavilyResults(payload: TavilySearchResponse): unknown[] {
  return (payload.results ?? []).map((result) => ({
    title: result.title,
    url: result.url,
    snippet: result.content,
  }))
}

function buildTavilySearchBody(
  input: SearchWebInput,
  maxResults: number
): Record<string, unknown> {
  return {
    query: input.query,
    max_results: maxResults,
    search_depth: "basic",
    ...(input.domains ? { include_domains: input.domains } : {}),
    ...(input.recency ? { time_range: input.recency } : {}),
  }
}

export function createTavilyWebSearchProvider(
  config: AppConfig
): WebSearchProvider {
  return {
    name: "tavily:keyless",
    async search(input: SearchWebInput) {
      if (config.webSearchBackend !== "keyless") {
        throw new WebSearchError(
          "web_search_provider_unsupported",
          "Tavily web search supports only the keyless backend in this slice"
        )
      }

      const bounded = boundSearchInput(input, config)
      const maxResults = bounded.maxResults ?? config.webSearchMaxResults
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tavily-Access-Mode": "keyless",
        },
        body: JSON.stringify(buildTavilySearchBody(bounded, maxResults)),
      })
      const payload = await readJson(response)

      if (!response.ok) {
        throw new WebSearchError(
          "web_search_failed",
          readErrorMessage(payload) ??
            `Tavily search request failed with status ${response.status}`
        )
      }

      if (!isObject(payload) || !Array.isArray(payload.results)) {
        throw new WebSearchError(
          "web_search_normalization_failed",
          "Tavily search output did not include a results array"
        )
      }

      const tavilyPayload = payload as TavilySearchResponse
      try {
        return normalizeSearchResults({
          query: bounded.query,
          provider: "tavily:keyless",
          rawResults: mapTavilyResults(tavilyPayload),
          maxResults,
          maxSnippetChars: config.webSearchMaxSnippetChars,
          metadata: {
            requestId: tavilyPayload.request_id,
            responseTime: tavilyPayload.response_time,
            credits: tavilyPayload.usage?.credits,
          },
        })
      } catch (error) {
        throw new WebSearchError(
          "web_search_normalization_failed",
          error instanceof Error ? error.message : "Tavily normalization failed"
        )
      }
    },
  }
}
