import {
  createSavedMemoryRequestSchema,
  memoriesListResponseSchema,
  savedMemoryCategoryKeySchema,
  savedMemorySchema,
  updateSavedMemoryRequestSchema,
  type CreateSavedMemoryRequest,
  type MemoriesListResponse,
  type SavedMemory,
  type SavedMemoryCategoryKey,
  type UpdateSavedMemoryRequest,
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

async function parseMemoryJson(response: Response): Promise<SavedMemory> {
  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, response.statusText), response.status)
  }

  return savedMemorySchema.parse(data)
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

export async function createMemory(input: CreateSavedMemoryRequest): Promise<SavedMemory> {
  const response = await fetch(`${API_BASE}/api/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createSavedMemoryRequestSchema.parse(input)),
  })
  return parseMemoryJson(response)
}

export async function updateMemory(
  memoryId: string,
  input: UpdateSavedMemoryRequest
): Promise<SavedMemory> {
  const response = await fetch(`${API_BASE}/api/memories/${memoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateSavedMemoryRequestSchema.parse(input)),
  })
  return parseMemoryJson(response)
}
