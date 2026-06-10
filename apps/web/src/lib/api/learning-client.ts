import {
  acceptLearningSuggestionRequestSchema,
  acceptLearningSuggestionResponseSchema,
  createLearningSkillRequestSchema,
  learningMemoriesListResponseSchema,
  learningRubricsListResponseSchema,
  learningSkillSchema,
  learningSkillsListResponseSchema,
  learningSuggestionSchema,
  learningSuggestionsListResponseSchema,
  learningSummarySchema,
  type AcceptLearningSuggestionRequest,
  type AcceptLearningSuggestionResponse,
  type CreateLearningSkillRequest,
  type LearningMemoriesListResponse,
  type LearningRubricsListResponse,
  type LearningSkill,
  type LearningSkillsListResponse,
  type LearningSuggestion,
  type LearningSuggestionsListResponse,
  type LearningSummary,
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

async function parseJson<T>(
  response: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const data = await response.json().catch(() => undefined)
  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(data, response.statusText),
      response.status
    )
  }

  return schema.parse(data)
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export async function getLearningSummary(): Promise<LearningSummary> {
  const response = await fetch(`${API_BASE}/api/learning/summary`)
  return parseJson(response, learningSummarySchema)
}

export async function listLearningSkills(input?: {
  page?: number
  pageSize?: number
}): Promise<LearningSkillsListResponse> {
  const response = await fetch(
    `${API_BASE}/api/learning/skills${buildQuery(input ?? {})}`
  )
  return parseJson(response, learningSkillsListResponseSchema)
}

export async function createLearningSkill(
  input: CreateLearningSkillRequest
): Promise<LearningSkill> {
  const response = await fetch(`${API_BASE}/api/learning/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createLearningSkillRequestSchema.parse(input)),
  })
  return parseJson(response, learningSkillSchema)
}

export async function listLearningMemories(input?: {
  page?: number
  pageSize?: number
  category?: string
}): Promise<LearningMemoriesListResponse> {
  const response = await fetch(
    `${API_BASE}/api/learning/memories${buildQuery(input ?? {})}`
  )
  return parseJson(response, learningMemoriesListResponseSchema)
}

export async function listLearningRubrics(input?: {
  page?: number
  pageSize?: number
}): Promise<LearningRubricsListResponse> {
  const response = await fetch(
    `${API_BASE}/api/learning/rubrics${buildQuery(input ?? {})}`
  )
  return parseJson(response, learningRubricsListResponseSchema)
}

export async function listLearningSuggestions(input?: {
  page?: number
  pageSize?: number
  status?: "pending" | "accepted" | "dismissed"
  threadId?: string
}): Promise<LearningSuggestionsListResponse> {
  const response = await fetch(
    `${API_BASE}/api/learning/suggestions${buildQuery(input ?? {})}`
  )
  return parseJson(response, learningSuggestionsListResponseSchema)
}

export async function acceptLearningSuggestion(
  suggestionId: string,
  input: AcceptLearningSuggestionRequest = {}
): Promise<AcceptLearningSuggestionResponse> {
  const response = await fetch(
    `${API_BASE}/api/learning/suggestions/${suggestionId}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(acceptLearningSuggestionRequestSchema.parse(input)),
    }
  )
  return parseJson(response, acceptLearningSuggestionResponseSchema)
}

export async function dismissLearningSuggestion(
  suggestionId: string
): Promise<LearningSuggestion> {
  const response = await fetch(
    `${API_BASE}/api/learning/suggestions/${suggestionId}/dismiss`,
    { method: "POST" }
  )
  return parseJson(response, learningSuggestionSchema)
}
