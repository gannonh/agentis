import {
  emptySearchResponse,
  normalizeSearchQuery,
  searchResponseSchema,
  type SearchResponse,
} from "@workspace/shared"
import { ApiError, parseJson } from "./client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

export async function searchWorkspace(query: string): Promise<SearchResponse> {
  const normalized = normalizeSearchQuery(query)
  if (normalized.status !== "ready") {
    return emptySearchResponse()
  }

  const params = new URLSearchParams({ q: normalized.query })
  const response = await fetch(`${API_BASE}/api/search?${params.toString()}`)
  try {
    return await parseJson(response, searchResponseSchema)
  } catch (caught) {
    if (caught instanceof ApiError) {
      throw caught
    }
    throw new ApiError("Search is unavailable right now.", 500)
  }
}
