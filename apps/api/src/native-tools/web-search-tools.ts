import { tool, type ToolSet } from "ai"
import { searchWebInputSchema } from "@workspace/shared"
import { WebSearchService } from "../research/web-search-service.js"
import { WebSearchError } from "../research/web-search-provider.js"

export function buildWebSearchTools(
  webSearchService: WebSearchService
): ToolSet {
  return {
    searchWeb: tool({
      description:
        "Search the public web for current information and return bounded cited source results.",
      inputSchema: searchWebInputSchema,
      execute: async (input) => {
        try {
          return await webSearchService.search(input)
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
