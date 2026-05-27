import {
  memoriesListResponseSchema,
  savedMemoryCategoryNameSchema,
  type MemoriesListResponse,
  type SavedMemoryCategoryName,
} from "@workspace/shared"
import { ApiError } from "./client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

async function parseJson(response: Response): Promise<MemoriesListResponse> {
  const data = await response.json()
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : response.statusText
    throw new ApiError(message, response.status)
  }
  return memoriesListResponseSchema.parse(data)
}

export async function listMemories(
  category?: SavedMemoryCategoryName
): Promise<MemoriesListResponse> {
  const query = category
    ? `?category=${encodeURIComponent(savedMemoryCategoryNameSchema.parse(category))}`
    : ""
  const response = await fetch(`${API_BASE}/api/memories${query}`)
  return parseJson(response)
}
