import {
  artifactDetailResponseSchema,
  artifactPublicSchema,
  artifactTypeSchema,
  documentDetailResponseSchema,
  documentPublicSchema,
  documentTypeSchema,
  updateDocumentContentRequestSchema,
  updateDocumentContentResponseSchema,
  updateArtifactVisibilityRequestSchema,
  updateArtifactVisibilityResponseSchema,
  updateDocumentVisibilityRequestSchema,
  updateDocumentVisibilityResponseSchema,
  createProjectMemoryRequestSchema,
  createProjectRequestSchema,
  projectMemorySchema,
  projectSchema,
  updateProjectMemoryRequestSchema,
  updateProjectRequestSchema,
  type ArtifactDetailResponse,
  type ArtifactPublic as Artifact,
  type ArtifactSource,
  type ArtifactType,
  type ArtifactVisibilityScope,
  type UpdateArtifactVisibilityRequest,
  type UpdateArtifactVisibilityResponse,
  type DocumentDetailResponse,
  type DocumentPublic as Document,
  type DocumentSource,
  type DocumentType,
  type DocumentVisibilityScope,
  type UpdateDocumentContentRequest,
  type UpdateDocumentContentResponse,
  type UpdateDocumentVisibilityRequest,
  type UpdateDocumentVisibilityResponse,
  type CreateProjectMemoryRequest,
  type CreateProjectRequest,
  type Project,
  type ProjectMemory,
  type UpdateProjectMemoryRequest,
  type UpdateProjectRequest,
} from "@workspace/shared"
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

async function throwResponseApiError(
  response: Response,
  fallback: string
): Promise<never> {
  const data = await response.json().catch(() => ({}))
  throw new ApiError(apiErrorMessage(data, fallback), response.status)
}

async function parseJson<T>(
  response: Response,
  schema: {
    parse: (data: unknown) => T
  }
): Promise<T> {
  let data: unknown
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new ApiError(
        response.statusText || "Request failed",
        response.status
      )
    }
    throw new ApiError("Invalid response", 500)
  }
  if (!response.ok) {
    throw new ApiError(
      apiErrorMessage(data, response.statusText),
      response.status
    )
  }
  return schema.parse(data)
}

function parseArray<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown
): T[] {
  if (!Array.isArray(data)) {
    throw new ApiError("Invalid response", 500)
  }
  return data.map((item) => schema.parse(item))
}

export async function listProjects(
  includeArchived = false
): Promise<Project[]> {
  const query = includeArchived ? "?includeArchived=true" : ""
  const response = await fetch(`${API_BASE}/api/projects${query}`)
  if (!response.ok) {
    await throwResponseApiError(response, response.statusText)
  }
  return parseArray(projectSchema, await response.json())
}

export async function createProject(
  body: CreateProjectRequest
): Promise<Project> {
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
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/archive`,
    {
      method: "POST",
    }
  )
  return parseJson(response, projectSchema)
}

export async function listProjectMemories(
  projectId: string
): Promise<ProjectMemory[]> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/memories`)
  if (!response.ok) {
    await throwResponseApiError(response, response.statusText)
  }
  return parseArray(projectMemorySchema, await response.json())
}

export async function createProjectMemory(
  projectId: string,
  body: CreateProjectMemoryRequest
): Promise<ProjectMemory> {
  const payload = createProjectMemoryRequestSchema.parse(body)
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/memories`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
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
    await throwResponseApiError(response, response.statusText)
  }
}

export type ArtifactListFilters = {
  query?: string
  type?: ArtifactType
  visibilityScope?: ArtifactVisibilityScope
  projectId?: string
  threadId?: string
  source?: ArtifactSource
  agentId?: string
}

export async function listArtifacts(
  filters: ArtifactListFilters = {}
): Promise<Artifact[]> {
  const params = new URLSearchParams()
  if (filters.query) params.set("query", filters.query)
  if (filters.type) params.set("type", artifactTypeSchema.parse(filters.type))
  if (filters.visibilityScope) {
    params.set("visibilityScope", filters.visibilityScope)
  }
  if (filters.projectId) params.set("projectId", filters.projectId)
  if (filters.threadId) params.set("threadId", filters.threadId)
  if (filters.source) params.set("source", filters.source)
  if (filters.agentId) params.set("agentId", filters.agentId)
  const query = params.toString()
  const response = await fetch(
    `${API_BASE}/api/artifacts${query ? `?${query}` : ""}`
  )
  if (!response.ok) {
    await throwResponseApiError(response, response.statusText)
  }
  return parseArray(artifactPublicSchema, await response.json())
}

export type DocumentListFilters = {
  query?: string
  documentType?: DocumentType
  visibilityScope?: DocumentVisibilityScope
  projectId?: string
  threadId?: string
  source?: DocumentSource
  agentId?: string
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
  if (filters.source) params.set("source", filters.source)
  if (filters.agentId) params.set("agentId", filters.agentId)
  const query = params.toString()
  const response = await fetch(
    `${API_BASE}/api/documents${query ? `?${query}` : ""}`
  )
  if (!response.ok) {
    await throwResponseApiError(response, response.statusText)
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

export async function getArtifactDetail(
  artifactId: string,
  options: { version?: number } = {}
): Promise<ArtifactDetailResponse> {
  const params = new URLSearchParams()
  if (options.version != null) {
    params.set("version", String(options.version))
  }
  const query = params.toString()
  const response = await fetch(
    `${API_BASE}/api/artifacts/${artifactId}/detail${query ? `?${query}` : ""}`
  )
  return parseJson(response, artifactDetailResponseSchema)
}

export async function getDocumentDetail(
  documentId: string,
  options: { version?: number } = {}
): Promise<DocumentDetailResponse> {
  const params = new URLSearchParams()
  if (options.version != null) {
    params.set("version", String(options.version))
  }
  const query = params.toString()
  const response = await fetch(
    `${API_BASE}/api/documents/${documentId}/detail${query ? `?${query}` : ""}`
  )
  return parseJson(response, documentDetailResponseSchema)
}

export async function updateDocumentContent(
  documentId: string,
  body: UpdateDocumentContentRequest
): Promise<UpdateDocumentContentResponse> {
  const payload = updateDocumentContentRequestSchema.parse(body)
  const response = await fetch(
    `${API_BASE}/api/documents/${documentId}/content`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return parseJson(response, updateDocumentContentResponseSchema)
}

export async function updateDocumentVisibility(
  documentId: string,
  body: UpdateDocumentVisibilityRequest
): Promise<UpdateDocumentVisibilityResponse> {
  const payload = updateDocumentVisibilityRequestSchema.parse(body)
  const response = await fetch(
    `${API_BASE}/api/documents/${documentId}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return parseJson(response, updateDocumentVisibilityResponseSchema)
}

export async function updateArtifactVisibility(
  artifactId: string,
  body: UpdateArtifactVisibilityRequest
): Promise<UpdateArtifactVisibilityResponse> {
  const payload = updateArtifactVisibilityRequestSchema.parse(body)
  const response = await fetch(
    `${API_BASE}/api/artifacts/${artifactId}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  return parseJson(response, updateArtifactVisibilityResponseSchema)
}

export function documentWorkspacePath(documentId: string): string {
  return `/documents/${documentId}`
}

export function artifactWorkspacePath(artifactId: string): string {
  return `/artifacts/${artifactId}`
}

export function artifactDownloadUrl(
  artifactId: string,
  options: { version?: number | null } = {}
): string {
  const url = `${API_BASE}/api/artifacts/${artifactId}/download`
  if (options.version == null) return url
  const params = new URLSearchParams({ version: String(options.version) })
  return `${url}?${params.toString()}`
}

export function documentDownloadUrl(documentId: string): string {
  return `${API_BASE}/api/documents/${documentId}/download`
}

export async function downloadArtifactFile(
  artifact: Artifact,
  options: { version?: number | null } = {}
): Promise<void> {
  const response = await fetch(artifactDownloadUrl(artifact.id, options))
  if (!response.ok) {
    await throwResponseApiError(response, "Download failed")
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = artifact.title
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadDocumentFile(document: Document): Promise<void> {
  const response = await fetch(documentDownloadUrl(document.id))
  if (!response.ok) {
    await throwResponseApiError(response, "Download failed")
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = document.title
  anchor.click()
  URL.revokeObjectURL(url)
}
