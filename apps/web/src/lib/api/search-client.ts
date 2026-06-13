import { searchResponseSchema, type SearchResponse } from "@workspace/shared"
import { ApiError } from "./client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

function apiErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error
  }
  return fallback
}

export async function searchWorkspace(query: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query })
  const response = await fetch(`${API_BASE}/api/search?${params.toString()}`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(
      apiErrorMessage(data, "Search is unavailable right now."),
      response.status
    )
  }
  return searchResponseSchema.parse(data)
}
