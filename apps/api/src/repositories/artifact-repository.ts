import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  or,
} from "drizzle-orm"
import type {
  Artifact,
  ArtifactSource,
  ArtifactType,
  ArtifactVersion,
  ArtifactVisibilityScope,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { documents, documentVersions } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapArtifact, mapArtifactVersion } from "../lib/mappers.js"

export type ArtifactListFilters = {
  query?: string
  type?: ArtifactType
  visibilityScope?: ArtifactVisibilityScope
  projectId?: string
  threadId?: string
  agentId?: string
  source?: ArtifactSource
}

function documentTypeForArtifact(type: ArtifactType): string {
  return type
}

function documentTypeFiltersForArtifact(type: ArtifactType): string[] {
  if (type === "document") return ["document", "markdown"]
  return [type]
}

function defaultContentFormat(input: {
  type: ArtifactType
  mimeType: string
}): Artifact["contentFormat"] {
  if (input.type === "document") return "markdown"
  if (input.mimeType === "text/html") return "html"
  if (input.mimeType === "application/json") return "json"
  if (input.mimeType.startsWith("text/")) return "text"
  return "binary"
}

function defaultVisibilityScope(input: {
  projectId?: string | null
  threadId?: string | null
}): ArtifactVisibilityScope {
  if (input.projectId) return "project"
  if (input.threadId) return "thread"
  return "global"
}

export class ArtifactRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    id?: string
    title: string
    description?: string
    type: ArtifactType
    contentFormat?: Artifact["contentFormat"]
    mimeType: string
    sizeBytes: number
    storageKey: string
    previewText?: string
    metadata?: Record<string, unknown>
    visibilityScope?: ArtifactVisibilityScope
    projectId?: string
    projectNameSnapshot?: string
    threadId?: string
    threadTitleSnapshot?: string
    runId?: string
    agentId?: string
    agentNameSnapshot?: string
    currentVersionId?: string
    currentVersion?: number
  }): Artifact {
    const now = nowIso()
    const row = {
      id: input.id ?? createId("artifact"),
      title: input.title,
      description: input.description ?? null,
      documentType: documentTypeForArtifact(input.type),
      contentFormat:
        input.contentFormat ??
        defaultContentFormat({ type: input.type, mimeType: input.mimeType }),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      previewText: input.previewText ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      visibilityScope:
        input.visibilityScope ??
        defaultVisibilityScope({
          projectId: input.projectId,
          threadId: input.threadId,
        }),
      projectId: input.projectId ?? null,
      projectNameSnapshot: input.projectNameSnapshot ?? null,
      threadId: input.threadId ?? null,
      threadTitleSnapshot: input.threadTitleSnapshot ?? null,
      runId: input.runId ?? null,
      agentId: input.agentId ?? null,
      agentNameSnapshot: input.agentNameSnapshot ?? null,
      currentVersionId: input.currentVersionId ?? null,
      currentVersion: input.currentVersion ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(documents).values(row).run()
    return mapArtifact(row)
  }

  getById(id: string): Artifact | null {
    const row = this.db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .get()
    return row ? mapArtifact(row) : null
  }

  listVersions(artifactId: string): ArtifactVersion[] {
    return this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, artifactId))
      .orderBy(documentVersions.version)
      .all()
      .map(mapArtifactVersion)
  }

  list(filters: ArtifactListFilters = {}): Artifact[] {
    const conditions = []
    if (filters.type) {
      conditions.push(
        inArray(
          documents.documentType,
          documentTypeFiltersForArtifact(filters.type)
        )
      )
    }
    if (filters.visibilityScope) {
      conditions.push(eq(documents.visibilityScope, filters.visibilityScope))
    }
    if (filters.projectId) {
      conditions.push(eq(documents.projectId, filters.projectId))
    }
    if (filters.threadId) {
      conditions.push(eq(documents.threadId, filters.threadId))
    }
    if (filters.agentId) {
      conditions.push(eq(documents.agentId, filters.agentId))
    }
    if (filters.source === "agent") {
      conditions.push(isNotNull(documents.runId))
    }
    if (filters.source === "user") {
      conditions.push(isNull(documents.runId))
    }
    if (filters.query?.trim()) {
      const pattern = `%${filters.query.trim()}%`
      conditions.push(
        or(
          like(documents.title, pattern),
          like(documents.description, pattern),
          like(documents.metadataJson, pattern),
          like(documents.projectNameSnapshot, pattern),
          like(documents.threadTitleSnapshot, pattern),
          like(documents.agentNameSnapshot, pattern),
          like(documents.previewText, pattern)
        )!
      )
    }

    const query = this.db
      .select()
      .from(documents)
      .orderBy(desc(documents.updatedAt), desc(documents.createdAt))

    if (conditions.length === 0) {
      return query.all().map(mapArtifact)
    }

    return query
      .where(and(...conditions))
      .all()
      .map(mapArtifact)
  }
}
