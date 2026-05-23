import {
  agentDetailResponseSchema,
  agentListItemSchema,
  createAgentRequestSchema,
  type AgentDetailResponse,
  type AgentListItem,
  type CreateAgentRequest,
} from "@workspace/shared"
import { ApiError } from "./client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

async function parseJson<T>(response: Response, schema: {
  parse: (data: unknown) => T
}): Promise<T> {
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
  return schema.parse(data)
}

function parseArray<T>(schema: { parse: (data: unknown) => T }, data: unknown): T[] {
  if (!Array.isArray(data)) {
    throw new ApiError("Invalid agents response", 500)
  }
  return data.map((item) => schema.parse(item))
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
  const response = await fetch(`${API_BASE}/api/agents/${agentId}`)
  return parseJson(response, agentDetailResponseSchema)
}
