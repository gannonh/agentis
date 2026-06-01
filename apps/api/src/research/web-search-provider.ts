import type { SearchWebInput, SearchWebOutput } from "@workspace/shared"

export type WebSearchErrorCode =
  | "web_search_unavailable"
  | "web_search_provider_unsupported"
  | "web_search_failed"
  | "web_search_normalization_failed"

export class WebSearchError extends Error {
  constructor(
    readonly code: WebSearchErrorCode,
    message: string
  ) {
    super(message)
    this.name = "WebSearchError"
  }
}

export type WebSearchProvider = {
  name: string
  search(input: SearchWebInput): Promise<SearchWebOutput>
}
