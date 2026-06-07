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
  if (type === "app") return ["app", "hyperapp"]
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

  createWithInitialVersion(input: {
    id?: string
    versionId?: string
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
    contentHash: string
    contentStorageKey: string
    changeSummary?: string
    createdByRunId?: string
    createdByThreadId?: string
  }): { artifact: Artifact; version: ArtifactVersion } {
    const now = nowIso()
    const versionId = input.versionId ?? createId("artifact_version")
    const artifactRow = {
      id: input.id ?? createId("artifact"),
      title: input.title,
      description: input.description ?? null,
      documentType: documentTypeForArtifact(input.type),
      contentFormat:
        input.contentFormat ??
        defaultContentFormat({ type: input.type, mimeType: input.mimeType }),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.contentStorageKey,
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
      currentVersionId: versionId,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    const versionRow = {
      id: versionId,
      documentId: artifactRow.id,
      version: 1,
      contentHash: input.contentHash,
      contentStorageKey: input.contentStorageKey,
      changeSummary: input.changeSummary ?? null,
      createdByRunId: input.createdByRunId ?? null,
      createdByThreadId: input.createdByThreadId ?? null,
      createdAt: now,
    }

    this.db.transaction((tx) => {
      tx.insert(documents).values(artifactRow).run()
      tx.insert(documentVersions).values(versionRow).run()
    })

    return {
      artifact: mapArtifact(artifactRow),
      version: mapArtifactVersion(versionRow),
    }
  }

  updateWithVersion(input: {
    artifactId: string
    version: number
    versionId?: string
    contentHash: string
    contentStorageKey: string
    changeSummary?: string
    createdByRunId?: string
    createdByThreadId?: string
    sizeBytes: number
    previewText?: string
    metadata?: Record<string, unknown>
  }): Artifact | null {
    const versionRow = {
      id: input.versionId ?? createId("artifact_version"),
      documentId: input.artifactId,
      version: input.version,
      contentHash: input.contentHash,
      contentStorageKey: input.contentStorageKey,
      changeSummary: input.changeSummary ?? null,
      createdByRunId: input.createdByRunId ?? null,
      createdByThreadId: input.createdByThreadId ?? null,
      createdAt: nowIso(),
    }
    let row: typeof documents.$inferSelect | undefined

    this.db.transaction((tx) => {
      const existing = tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, input.artifactId))
        .get()
      if (!existing) {
        row = undefined
        return
      }

      tx.insert(documentVersions).values(versionRow).run()
      tx.update(documents)
        .set({
          currentVersionId: versionRow.id,
          currentVersion: input.version,
          storageKey: input.contentStorageKey,
          sizeBytes: input.sizeBytes,
          previewText: input.previewText ?? null,
          metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
          updatedAt: nowIso(),
        })
        .where(eq(documents.id, input.artifactId))
        .run()
      row = tx
        .select()
        .from(documents)
        .where(eq(documents.id, input.artifactId))
        .get()
    })

    return row ? mapArtifact(row) : null
  }

  getVersion(artifactId: string, version: number): ArtifactVersion | null {
    const row = this.db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, artifactId),
          eq(documentVersions.version, version)
        )
      )
      .get()
    return row ? mapArtifactVersion(row) : null
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

  updateVisibilityScope(input: {
    artifactId: string
    visibilityScope: ArtifactVisibilityScope
    projectId?: string | null
    projectNameSnapshot?: string | null
    threadId?: string | null
    threadTitleSnapshot?: string | null
  }): Artifact | null {
    const existing = this.getById(input.artifactId)
    if (!existing) return null

    this.db
      .update(documents)
      .set({
        visibilityScope: input.visibilityScope,
        projectId:
          input.projectId !== undefined ? input.projectId : existing.projectId,
        projectNameSnapshot:
          input.projectNameSnapshot !== undefined
            ? input.projectNameSnapshot
            : existing.projectNameSnapshot,
        threadId:
          input.threadId !== undefined ? input.threadId : existing.threadId,
        threadTitleSnapshot:
          input.threadTitleSnapshot !== undefined
            ? input.threadTitleSnapshot
            : existing.threadTitleSnapshot,
        updatedAt: nowIso(),
      })
      .where(eq(documents.id, input.artifactId))
      .run()

    return this.getById(input.artifactId)
  }

  deleteById(artifactId: string): boolean {
    let deleted = false

    this.db.transaction((tx) => {
      const existing = tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, artifactId))
        .get()
      if (!existing) return

      tx.delete(documentVersions)
        .where(eq(documentVersions.documentId, artifactId))
        .run()
      tx.delete(documents).where(eq(documents.id, artifactId)).run()
      deleted = true
    })

    return deleted
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
