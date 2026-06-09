import { tool, type ToolSet } from "ai"
import { searchWebInputSchema, type SearchWebOutput } from "@workspace/shared"
import { WebSearchService } from "../research/web-search-service.js"
import { WebSearchError } from "../research/web-search-provider.js"

export function buildWebSearchTools(
  webSearchService: WebSearchService,
  options?: {
    onSearchResult?: (output: SearchWebOutput) => void
  }
): ToolSet {
  return {
    searchWeb: tool({
      description:
        "Search the public web for current information and return bounded cited source results.",
      inputSchema: searchWebInputSchema,
      execute: async (input) => {
        try {
          const output = await webSearchService.search(input)
          options?.onSearchResult?.(output)
          return output
        } catch (error) {
          if (error instanceof WebSearchError) {
            throw error
          }
          throw new WebSearchError(
            "web_search_failed",
            error instanceof Error ? error.message : "Web search failed"
          )
        }
      },
    }),
  }
}
