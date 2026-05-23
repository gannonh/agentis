import {
  artifactPublicSchema,
  artifactTypeSchema,
  createProjectMemoryRequestSchema,
  createProjectRequestSchema,
  projectMemorySchema,
  projectSchema,
  updateProjectMemoryRequestSchema,
  updateProjectRequestSchema,
  type Artifact,
  type ArtifactType,
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

export type ArtifactListFilters = {
  query?: string
  type?: ArtifactType
  projectId?: string
  threadId?: string
}

export async function listArtifacts(
  filters: ArtifactListFilters = {}
): Promise<Artifact[]> {
  const params = new URLSearchParams()
  if (filters.query) params.set("query", filters.query)
  if (filters.type) params.set("type", filters.type)
  if (filters.projectId) params.set("projectId", filters.projectId)
  if (filters.threadId) params.set("threadId", filters.threadId)
  const query = params.toString()
  const response = await fetch(
    `${API_BASE}/api/artifacts${query ? `?${query}` : ""}`
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
  return parseArray(artifactPublicSchema, await response.json())
}

export async function uploadArtifact(input: {
  title: string
  type: ArtifactType
  file: File
  description?: string
  projectId?: string
  threadId?: string
}): Promise<Artifact> {
  const parsedType = artifactTypeSchema.parse(input.type)
  const form = new FormData()
  form.set("title", input.title)
  form.set("type", parsedType)
  form.set("file", input.file)
  if (input.description) form.set("description", input.description)
  if (input.projectId) form.set("projectId", input.projectId)
  if (input.threadId) form.set("threadId", input.threadId)

  const response = await fetch(`${API_BASE}/api/artifacts`, {
    method: "POST",
    body: form,
  })
  return parseJson(response, artifactPublicSchema)
}

export function artifactDownloadUrl(artifactId: string) {
  return `${API_BASE}/api/artifacts/${artifactId}/download`
}
