import {
  abortRunResponseSchema,
  connectIntegrationResponseSchema,
  createFollowUpRequestSchema,
  createFollowUpResponseSchema,
  createThreadRequestSchema,
  decideToolApprovalResponseSchema,
  createThreadResponseSchema,
  createToolGrantRequestSchema,
  integrationsListResponseSchema,
  refreshIntegrationsResponseSchema,
  runtimeHealthSchema,
  threadDetailSchema,
  threadListItemSchema,
  threadToolGrantsResponseSchema,
  toolAccessGrantSchema,
  updateThreadRequestSchema,
  type ConnectIntegrationResponse,
  type CreateFollowUpRequest,
  type CreateThreadRequest,
  type CreateToolGrantRequest,
  type IntegrationsListQuery,
  type IntegrationsListResponse,
  type RuntimeHealth,
  type ThreadDetail,
  type ThreadListItem,
  type ThreadToolGrantsResponse,
  type ToolAccessGrant,
  type UpdateThreadRequest,
} from "@workspace/shared"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function parseJson<T>(response: Response, schema: {
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

export async function fetchRuntimeHealth(): Promise<RuntimeHealth> {
  try {
    const response = await fetch(`${API_BASE}/api/runtime/health`)
    if (!response.ok) {
      return { available: false, reason: "api_unavailable" }
    }
    return runtimeHealthSchema.parse(await response.json())
  } catch {
    return { available: false, reason: "api_unavailable" }
  }
}

export async function listThreads(): Promise<ThreadListItem[]> {
  const response = await fetch(`${API_BASE}/api/threads`)
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
  const data = await response.json()
  return zodArray(threadListItemSchema, data)
}

function zodArray<T>(schema: { parse: (data: unknown) => T }, data: unknown): T[] {
  if (!Array.isArray(data)) {
    throw new ApiError("Invalid threads response", 500)
  }
  return data.map((item) => schema.parse(item))
}

export async function createThread(body: CreateThreadRequest) {
  const payload = createThreadRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, createThreadResponseSchema)
}

export async function getThread(threadId: string): Promise<ThreadDetail> {
  const response = await fetch(`${API_BASE}/api/threads/${threadId}`)
  return parseJson(response, threadDetailSchema)
}

export async function updateThread(
  threadId: string,
  body: UpdateThreadRequest
) {
  const payload = updateThreadRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, threadListItemSchema)
}

export async function sendFollowUp(
  threadId: string,
  body: CreateFollowUpRequest
) {
  const payload = createFollowUpRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, createFollowUpResponseSchema)
}

export async function streamRun(runId: string, signal?: AbortSignal) {
  const response = await fetch(`${API_BASE}/api/runs/${runId}/stream`, {
    method: "POST",
    signal,
  })
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
  if (!response.body) {
    throw new ApiError("Missing stream body", 500)
  }
  return response.body
}

export async function listIntegrations(
  query: Pick<IntegrationsListQuery, "q" | "category"> = {}
): Promise<IntegrationsListResponse> {
  const params = new URLSearchParams()
  if (query.q?.trim()) params.set("q", query.q.trim())
  if (query.category?.trim()) params.set("category", query.category.trim())
  const suffix = params.size > 0 ? `?${params.toString()}` : ""
  const response = await fetch(`${API_BASE}/api/integrations${suffix}`)
  return parseJson(response, integrationsListResponseSchema)
}

export async function connectIntegration(
  toolkitSlug: string
): Promise<ConnectIntegrationResponse> {
  const response = await fetch(
    `${API_BASE}/api/integrations/${toolkitSlug}/connect`,
    { method: "POST" }
  )
  return parseJson(response, connectIntegrationResponseSchema)
}

export async function resetIntegrationConnection(toolkitSlug: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/integrations/${toolkitSlug}/connection`,
    { method: "DELETE" }
  )
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
}

export async function refreshIntegrations() {
  const response = await fetch(`${API_BASE}/api/integrations/refresh`, {
    method: "POST",
  })
  return parseJson(response, refreshIntegrationsResponseSchema)
}

export async function getThreadToolGrants(
  threadId: string
): Promise<ThreadToolGrantsResponse> {
  const response = await fetch(`${API_BASE}/api/threads/${threadId}/tool-grants`)
  return parseJson(response, threadToolGrantsResponseSchema)
}

export async function grantThreadTool(
  threadId: string,
  body: CreateToolGrantRequest
): Promise<ToolAccessGrant> {
  const payload = createToolGrantRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/threads/${threadId}/tool-grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, toolAccessGrantSchema)
}

export async function revokeThreadToolGrant(
  threadId: string,
  grantId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/threads/${threadId}/tool-grants/${grantId}`,
    { method: "DELETE" }
  )
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
}

export async function decideToolApproval(
  runId: string,
  toolCallId: string,
  decision: "approve" | "deny"
) {
  const response = await fetch(
    `${API_BASE}/api/runs/${runId}/tool-approvals/${encodeURIComponent(toolCallId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    }
  )
  return parseJson(response, decideToolApprovalResponseSchema)
}

export async function abortRun(runId: string) {
  const response = await fetch(`${API_BASE}/api/runs/${runId}/abort`, {
    method: "POST",
  })
  return parseJson(response, abortRunResponseSchema)
}

export { ApiError }
