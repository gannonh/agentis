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

type GatewaySearchError = {
  error: string
  message: string
  statusCode?: number
}

type ParallelSearchResponse = {
  results?: Array<{
    title?: string
    url?: string
    excerpt?: string
    excerpts?: string[]
    publishDate?: string | null
  }>
  searchId?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isGatewaySearchError(value: unknown): value is GatewaySearchError {
  return isObject(value) && "error" in value && "message" in value
}

function readGatewayResults(output: unknown): unknown[] {
  if (isGatewaySearchError(output)) {
    throw new WebSearchError("web_search_failed", output.message)
  }
  if (!isObject(output)) {
    throw new WebSearchError(
      "web_search_normalization_failed",
      "Gateway search output was not an object"
    )
  }
  if (!Array.isArray(output.results)) {
    throw new WebSearchError(
      "web_search_normalization_failed",
      "Gateway search output did not include a results array"
    )
  }
  return output.results
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

type VercelGatewaySearchBackend = "perplexity" | "parallel"

function gatewayToolName(backend: VercelGatewaySearchBackend): string {
  return backend === "parallel" ? "parallel_search" : "perplexity_search"
}

function gatewayRequestId(
  backend: VercelGatewaySearchBackend,
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
  if (
    config.webSearchBackend !== "perplexity" &&
    config.webSearchBackend !== "parallel"
  ) {
    throw new WebSearchError(
      "web_search_provider_unsupported",
      "Vercel Gateway web search supports only perplexity and parallel backends"
    )
  }
  if (!config.vercelAiGatewayApiKey) {
    throw new WebSearchError(
      "web_search_unavailable",
      "VERCEL_AI_GATEWAY_API_KEY is not configured"
    )
  }

  const backend = config.webSearchBackend
  const gateway = createGateway({ apiKey: config.vercelAiGatewayApiKey })
  const providerName = `vercel-gateway:${backend}`

  return {
    name: providerName,
    async search(input: SearchWebInput) {
      const bounded = boundSearchInput(input, config)
      const maxResults = bounded.maxResults ?? config.webSearchMaxResults
      const toolName = gatewayToolName(backend)

      try {
        if (backend === "parallel" && bounded.recency) {
          throw new WebSearchError(
            "web_search_provider_unsupported",
            "The parallel web search backend does not support recency filters"
          )
        }

        const searchTool =
          backend === "parallel"
            ? gateway.tools.parallelSearch({
                maxResults,
                ...(bounded.domains
                  ? { searchDomainFilter: bounded.domains }
                  : {}),
              } as Parameters<typeof gateway.tools.parallelSearch>[0] & {
                searchDomainFilter?: string[]
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

        const gatewayResults = readGatewayResults(toolResult.output)
        const rawResults =
          backend === "parallel"
            ? mapParallelResults(gatewayResults)
            : gatewayResults

        return normalizeSearchResults({
          query: bounded.query,
          provider: providerName,
          rawResults,
          maxResults,
          maxSnippetChars: config.webSearchMaxSnippetChars,
          metadata: {
            gatewayTool: toolName,
            requestId: gatewayRequestId(backend, toolResult.output),
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

function mapParallelResults(results: unknown[]) {
  return results.map((result) => {
    if (!isObject(result)) return {}
    const excerpts = Array.isArray(result.excerpts)
      ? result.excerpts.filter((excerpt): excerpt is string =>
          typeof excerpt === "string"
        )
      : []
    return {
      title: result.title,
      url: result.url,
      snippet: excerpts.length > 0 ? excerpts.join("\n\n") : result.excerpt,
      publishedAt: result.publishDate ?? undefined,
    }
  })
}
