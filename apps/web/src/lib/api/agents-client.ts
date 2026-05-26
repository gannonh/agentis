import {
  agentDetailResponseSchema,
  agentListItemSchema,
  createAgentPromotionDraftResponseSchema,
  createAgentRequestSchema,
  createAgentTestThreadRequestSchema,
  createThreadResponseSchema,
  updateAgentPromotionDraftRequestSchema,
  updateAgentRequestSchema,
  type AgentDetailResponse,
  type AgentListItem,
  type CreateAgentPromotionDraftResponse,
  type CreateAgentRequest,
  type CreateAgentTestThreadRequest,
  type CreateThreadResponse,
  type UpdateAgentPromotionDraftRequest,
  type UpdateAgentRequest,
} from "@workspace/shared"
import { ApiError } from "@/lib/api/client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

async function parseJson<T>(
  response: Response,
  schema: {
    parse: (data: unknown) => T
  }
): Promise<T> {
  const data: unknown = await response.json().catch(() => undefined)
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
  if (data === undefined) {
    throw new ApiError("Invalid JSON response", 500)
  }
  return schema.parse(data)
}

function parseArray<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T[] {
  if (!Array.isArray(data)) {
    throw new ApiError("Invalid agents response", 500)
  }
  return data.map((item) => schema.parse(item))
}

function agentPath(agentId: string): string {
  return `${API_BASE}/api/agents/${encodeURIComponent(agentId)}`
}

export async function listAgents(): Promise<AgentListItem[]> {
  const response = await fetch(`${API_BASE}/api/agents`)
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : response.statusText
    throw new ApiError(message, response.status)
  }
  return parseArray(agentListItemSchema, await response.json())
}

export async function createAgent(
  body: CreateAgentRequest
): Promise<AgentDetailResponse> {
  const payload = createAgentRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, agentDetailResponseSchema)
}

export async function getAgent(agentId: string): Promise<AgentDetailResponse> {
  const response = await fetch(agentPath(agentId))
  return parseJson(response, agentDetailResponseSchema)
}

export async function createAgentPromotionDraft(
  threadId: string
): Promise<CreateAgentPromotionDraftResponse> {
  const response = await fetch(
    `${API_BASE}/api/threads/${encodeURIComponent(threadId)}/promotion-drafts`,
    { method: "POST" }
  )
  return parseJson(response, createAgentPromotionDraftResponseSchema)
}

export async function getAgentPromotionDraft(
  draftId: string
): Promise<CreateAgentPromotionDraftResponse> {
  const response = await fetch(
    `${API_BASE}/api/agent-promotion-drafts/${encodeURIComponent(draftId)}`
  )
  return parseJson(response, createAgentPromotionDraftResponseSchema)
}

export async function updateAgentPromotionDraft(
  draftId: string,
  body: UpdateAgentPromotionDraftRequest
): Promise<CreateAgentPromotionDraftResponse> {
  const payload = updateAgentPromotionDraftRequestSchema.parse(body)
  const response = await fetch(
    `${API_BASE}/api/agent-promotion-drafts/${encodeURIComponent(draftId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return parseJson(response, createAgentPromotionDraftResponseSchema)
}

export async function updateAgent(
  agentId: string,
  body: UpdateAgentRequest
): Promise<AgentDetailResponse> {
  const payload = updateAgentRequestSchema.parse(body)
  const response = await fetch(agentPath(agentId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, agentDetailResponseSchema)
}

export async function startAgentTestThread(
  agentId: string,
  body: CreateAgentTestThreadRequest
): Promise<CreateThreadResponse> {
  const payload = createAgentTestThreadRequestSchema.parse(body)
  const response = await fetch(`${agentPath(agentId)}/test-thread`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, createThreadResponseSchema)
}
