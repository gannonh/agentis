import {
  documentDetailResponseSchema,
  documentPublicSchema,
  documentTypeSchema,
  createProjectMemoryRequestSchema,
  createProjectRequestSchema,
  projectMemorySchema,
  projectSchema,
  updateProjectMemoryRequestSchema,
  updateProjectRequestSchema,
  type DocumentDetailResponse,
  type DocumentPublic as Document,
  type DocumentType,
  type DocumentVisibilityScope,
  type CreateProjectMemoryRequest,
  type CreateProjectRequest,
  type Project,
  type ProjectMemory,
  type UpdateProjectMemoryRequest,
  type UpdateProjectRequest,
} from "@workspace/shared"
import { ApiError } from "./client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

async function parseJson<T>(response: Response, schema: {
  parse: (data: unknown) => T
}): Promise<T> {
  let data: unknown
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new ApiError(response.statusText || "Request failed", response.status)
    }
    throw new ApiError("Invalid response", 500)
  }
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
    throw new ApiError("Invalid response", 500)
  }
  return data.map((item) => schema.parse(item))
}

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

export async function listProjects(includeArchived = false): Promise<Project[]> {
  const query = includeArchived ? "?includeArchived=true" : ""
  const response = await fetch(`${API_BASE}/api/projects${query}`)
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
  return parseArray(projectSchema, await response.json())
}

export async function createProject(body: CreateProjectRequest): Promise<Project> {
  const payload = createProjectRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, projectSchema)
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}`)
  return parseJson(response, projectSchema)
}

export async function updateProject(
  projectId: string,
  body: UpdateProjectRequest
): Promise<Project> {
  const payload = updateProjectRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, projectSchema)
}

export async function archiveProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/archive`, {
    method: "POST",
  })
  return parseJson(response, projectSchema)
}

export async function listProjectMemories(
  projectId: string
): Promise<ProjectMemory[]> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/memories`)
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
  return parseArray(projectMemorySchema, await response.json())
}

export async function createProjectMemory(
  projectId: string,
  body: CreateProjectMemoryRequest
): Promise<ProjectMemory> {
  const payload = createProjectMemoryRequestSchema.parse(body)
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(response, projectMemorySchema)
}

export async function updateProjectMemory(
  projectId: string,
  memoryId: string,
  body: UpdateProjectMemoryRequest
): Promise<ProjectMemory> {
  const payload = updateProjectMemoryRequestSchema.parse(body)
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/memories/${memoryId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return parseJson(response, projectMemorySchema)
}

export async function deleteProjectMemory(
  projectId: string,
  memoryId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/memories/${memoryId}`,
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

export type DocumentListFilters = {
  query?: string
  documentType?: DocumentType
  visibilityScope?: DocumentVisibilityScope
  projectId?: string
  threadId?: string
}

export async function listDocuments(
  filters: DocumentListFilters = {}
): Promise<Document[]> {
  const params = new URLSearchParams()
  if (filters.query) params.set("query", filters.query)
  if (filters.documentType) params.set("documentType", filters.documentType)
  if (filters.visibilityScope) {
    params.set("visibilityScope", filters.visibilityScope)
  }
  if (filters.projectId) params.set("projectId", filters.projectId)
  if (filters.threadId) params.set("threadId", filters.threadId)
  const query = params.toString()
  const response = await fetch(
    `${API_BASE}/api/documents${query ? `?${query}` : ""}`
  )
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(
      apiErrorMessage(data, response.statusText),
      response.status
    )
  }
  return parseArray(documentPublicSchema, await response.json())
}

export async function uploadDocument(input: {
  title: string
  documentType: DocumentType
  file: File
  description?: string
  projectId?: string
  threadId?: string
}): Promise<Document> {
  const parsedType = documentTypeSchema.parse(input.documentType)
  const form = new FormData()
  form.set("title", input.title)
  form.set("documentType", parsedType)
  form.set("file", input.file)
  if (input.description) form.set("description", input.description)
  if (input.projectId) form.set("projectId", input.projectId)
  if (input.threadId) form.set("threadId", input.threadId)

  const response = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    body: form,
  })
  return parseJson(response, documentPublicSchema)
}

export async function getDocumentDetail(
  documentId: string
): Promise<DocumentDetailResponse> {
  const response = await fetch(`${API_BASE}/api/documents/${documentId}/detail`)
  return parseJson(response, documentDetailResponseSchema)
}

export function documentDownloadUrl(documentId: string) {
  return `${API_BASE}/api/documents/${documentId}/download`
}

export async function downloadDocumentFile(document: Document): Promise<void> {
  const response = await fetch(documentDownloadUrl(document.id))
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(apiErrorMessage(data, "Download failed"), response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = document.title
  anchor.click()
  URL.revokeObjectURL(url)
}
