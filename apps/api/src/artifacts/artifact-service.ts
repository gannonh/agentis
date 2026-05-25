import { extname } from "node:path"
import type { Artifact, ArtifactType } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { LocalArtifactStorage } from "./local-artifact-storage.js"

function inferMimeType(filename: string, fallback?: string) {
  if (fallback?.trim()) return fallback
  const ext = extname(filename).toLowerCase()
  switch (ext) {
    case ".txt":
    case ".md":
      return "text/plain"
    case ".html":
      return "text/html"
    case ".json":
      return "application/json"
    case ".pdf":
      return "application/pdf"
    default:
      return "application/octet-stream"
  }
}

function buildPreviewText(content: string, maxChars: number) {
  const trimmed = content.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}…`
}

export class ArtifactService {
  private readonly storage: LocalArtifactStorage

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {
    this.storage = new LocalArtifactStorage(config)
  }

  private captureProvenance(input: {
    projectId?: string
    threadId?: string
    runId?: string
  }) {
    const project = input.projectId
      ? this.repos.projects.getById(input.projectId)
      : null
    const run = input.runId ? this.repos.runs.getById(input.runId) : null
    const threadId = input.threadId ?? run?.threadId
    const thread = threadId ? this.repos.threads.getById(threadId) : null
    const agentId = thread?.agentId ?? run?.agentId
    const agent = agentId ? this.repos.agents.getById(agentId) : null
    return {
      threadId,
      projectNameSnapshot: project?.name,
      threadTitleSnapshot: thread?.title,
      agentId: agentId ?? undefined,
      agentNameSnapshot: thread?.agentNameSnapshot ?? agent?.name ?? undefined,
    }
  }

  upload(input: {
    title: string
    description?: string
    type: ArtifactType
    filename: string
    mimeType?: string
    data: Buffer
    previewText?: string
    projectId?: string
    threadId?: string
  }):
    | { ok: true; artifact: Artifact }
    | { ok: false; code: string; message: string } {
    if (input.data.byteLength > this.config.artifactMaxUploadBytes) {
      return {
        ok: false,
        code: "artifact_too_large",
        message: "Artifact exceeds maximum upload size",
      }
    }

    const storageKey = this.storage.createStorageKey(input.filename)
    try {
      this.storage.write(storageKey, input.data)
    } catch {
      return {
        ok: false,
        code: "artifact_storage_failed",
        message: "Failed to store artifact file",
      }
    }

    const mimeType = inferMimeType(input.filename, input.mimeType)
    const textContent = mimeType.startsWith("text/")
      ? input.data.toString("utf8")
      : ""
    const previewText =
      input.previewText ??
      buildPreviewText(textContent, this.config.artifactPreviewMaxChars)

    const provenance = this.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
    })

    try {
      const artifact = this.repos.artifacts.create({
        title: input.title,
        description: input.description,
        type: input.type,
        mimeType,
        sizeBytes: input.data.byteLength,
        storageKey,
        previewText,
        projectId: input.projectId,
        ...provenance,
      })
      return { ok: true, artifact }
    } catch {
      this.storage.delete(storageKey)
      return {
        ok: false,
        code: "artifact_storage_failed",
        message: "Failed to persist artifact metadata",
      }
    }
  }

  registerGenerated(input: {
    title: string
    description?: string
    type: ArtifactType
    filename: string
    content: string
    previewText?: string
    projectId?: string
    threadId?: string
    runId?: string
  }):
    | { ok: true; artifact: Artifact }
    | { ok: false; code: string; message: string } {
    const data = Buffer.from(input.content, "utf8")
    if (data.byteLength > this.config.artifactMaxUploadBytes) {
      return {
        ok: false,
        code: "artifact_too_large",
        message: "Artifact exceeds maximum upload size",
      }
    }

    const storageKey = this.storage.createStorageKey(input.filename)
    try {
      this.storage.write(storageKey, data)
    } catch {
      return {
        ok: false,
        code: "artifact_storage_failed",
        message: "Failed to store generated artifact",
      }
    }

    const provenance = this.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
    })

    try {
      const artifact = this.repos.artifacts.create({
        title: input.title,
        description: input.description,
        type: input.type,
        mimeType: "text/plain",
        sizeBytes: data.byteLength,
        storageKey,
        previewText:
          input.previewText ??
          buildPreviewText(input.content, this.config.artifactPreviewMaxChars),
        projectId: input.projectId,
        runId: input.runId,
        ...provenance,
        metadata: { source: "generated" },
      })
      return { ok: true, artifact }
    } catch {
      this.storage.delete(storageKey)
      return {
        ok: false,
        code: "artifact_storage_failed",
        message: "Failed to persist generated artifact metadata",
      }
    }
  }

  getDownload(artifactId: string):
    | {
        ok: true
        artifact: Artifact
        data: Buffer
      }
    | { ok: false; code: string; message: string; status: number } {
    const artifact = this.repos.artifacts.getById(artifactId)
    if (!artifact) {
      return {
        ok: false,
        code: "artifact_not_found",
        message: "Artifact not found",
        status: 404,
      }
    }

    let data: Buffer
    try {
      data = this.storage.read(artifact.storageKey)
    } catch {
      return {
        ok: false,
        code: "artifact_blob_missing",
        message: "Artifact file is missing",
        status: 404,
      }
    }

    return {
      ok: true,
      artifact,
      data,
    }
  }
}
