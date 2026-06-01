import { createGateway, generateText } from "ai"
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

type PerplexitySearchResponse = {
  results?: Array<{
    title: string
    url: string
    snippet?: string
    date?: string
    lastUpdated?: string
  }>
  id?: string
}

type PerplexitySearchError = {
  error: string
  message: string
  statusCode?: number
}

type ParallelSearchResponse = {
  results?: Array<{
    title?: string
    url?: string
    excerpt?: string
    publishDate?: string | null
  }>
  searchId?: string
}

function isPerplexityError(value: unknown): value is PerplexitySearchError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    "message" in value
  )
}

function mapGatewayFailure(error: unknown): WebSearchError {
  if (error instanceof WebSearchError) return error
  const message =
    error instanceof Error
      ? error.message
      : "Web search provider request failed"
  if (/unsupported|not found|unknown tool/i.test(message)) {
    return new WebSearchError("web_search_provider_unsupported", message)
  }
  if (/unauthorized|api key|credential/i.test(message)) {
    return new WebSearchError("web_search_unavailable", message)
  }
  return new WebSearchError("web_search_failed", message)
}

function gatewayToolName(backend: AppConfig["webSearchBackend"]): string {
  return backend === "parallel" ? "parallel_search" : "perplexity_search"
}

function gatewayRequestId(
  backend: AppConfig["webSearchBackend"],
  output: unknown
): string | undefined {
  if (backend === "parallel") {
    return (output as ParallelSearchResponse).searchId
  }
  return (output as PerplexitySearchResponse).id
}

export function createVercelGatewayWebSearchProvider(
  config: AppConfig
): WebSearchProvider {
  if (!config.aiGatewayApiKey) {
    throw new WebSearchError(
      "web_search_unavailable",
      "AI Gateway API key is not configured"
    )
  }

  const gateway = createGateway({ apiKey: config.aiGatewayApiKey })
  const providerName = `vercel-gateway:${config.webSearchBackend}`

  return {
    name: providerName,
    async search(input: SearchWebInput) {
      const bounded = boundSearchInput(input, config)
      const maxResults = bounded.maxResults ?? config.webSearchMaxResults
      const toolName = gatewayToolName(config.webSearchBackend)

      try {
        const searchTool =
          config.webSearchBackend === "parallel"
            ? gateway.tools.parallelSearch({
                maxResults,
              })
            : gateway.tools.perplexitySearch({
                maxResults,
                searchRecencyFilter: bounded.recency,
                searchDomainFilter: bounded.domains,
              })

        const result = await generateText({
          model: gateway("openai/gpt-4o-mini"),
          prompt: `Search the web for: ${bounded.query}`,
          tools: { [toolName]: searchTool },
          toolChoice: { type: "tool", toolName },
          maxRetries: 0,
        })

        const toolResult = result.toolResults.find(
          (entry) => entry.toolName === toolName
        )
        if (!toolResult) {
          throw new WebSearchError(
            "web_search_failed",
            "Gateway search tool did not return a result"
          )
        }

        if (isPerplexityError(toolResult.output)) {
          throw new WebSearchError(
            "web_search_failed",
            toolResult.output.message
          )
        }

        const rawResults =
          config.webSearchBackend === "parallel"
            ? mapParallelResults(toolResult.output as ParallelSearchResponse)
            : ((toolResult.output as PerplexitySearchResponse).results ?? [])

        return normalizeSearchResults({
          query: bounded.query,
          provider: providerName,
          rawResults,
          maxResults,
          maxSnippetChars: config.webSearchMaxSnippetChars,
          metadata: {
            gatewayTool: toolName,
            requestId: gatewayRequestId(
              config.webSearchBackend,
              toolResult.output
            ),
          },
        })
      } catch (error) {
        if (error instanceof Error && /normalization/i.test(error.message)) {
          throw new WebSearchError(
            "web_search_normalization_failed",
            error.message
          )
        }
        throw mapGatewayFailure(error)
      }
    },
  }
}

function mapParallelResults(response: ParallelSearchResponse) {
  return (response.results ?? []).map((result) => ({
    title: result.title,
    url: result.url,
    snippet: result.excerpt,
    publishedAt: result.publishDate ?? undefined,
  }))
}
