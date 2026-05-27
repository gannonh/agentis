import {
  memoriesListResponseSchema,
  savedMemoryCategoryKeySchema,
  type MemoriesListResponse,
  type SavedMemoryCategoryKey,
} from "@workspace/shared"
import { ApiError } from "./client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

function getErrorMessage(data: unknown, fallback: string): string {
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

async function parseJson(response: Response): Promise<MemoriesListResponse> {
  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, response.statusText), response.status)
  }

  return memoriesListResponseSchema.parse(data)
}

export async function listMemories(
  category?: SavedMemoryCategoryKey
): Promise<MemoriesListResponse> {
  const query = category
    ? `?category=${encodeURIComponent(savedMemoryCategoryKeySchema.parse(category))}`
    : ""
  const response = await fetch(`${API_BASE}/api/memories${query}`)
  return parseJson(response)
}
