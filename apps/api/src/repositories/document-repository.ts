import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm"
import type {
  Document,
  DocumentSource,
  DocumentType,
  DocumentVersion,
  DocumentVisibilityScope,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { documents, documentVersions } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapDocument, mapDocumentVersion } from "../lib/mappers.js"

export type DocumentListFilters = {
  query?: string
  documentType?: DocumentType
  visibilityScope?: DocumentVisibilityScope
  projectId?: string
  threadId?: string
  agentId?: string
  source?: DocumentSource
}

function defaultVisibilityScope(input: {
  projectId?: string | null
  threadId?: string | null
}): DocumentVisibilityScope {
  if (input.projectId) return "project"
  if (input.threadId) return "thread"
  return "global"
}

function markdownDocumentTypeCondition() {
  return inArray(documents.documentType, ["document", "markdown"])
}

export class DocumentRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    id?: string
    title: string
    description?: string
    documentType: DocumentType
    contentFormat?: string
    mimeType: string
    sizeBytes: number
    storageKey: string
    previewText?: string
    metadata?: Record<string, unknown>
    visibilityScope?: DocumentVisibilityScope
    projectId?: string
    projectNameSnapshot?: string
    threadId?: string
    threadTitleSnapshot?: string
    runId?: string
    agentId?: string
    agentNameSnapshot?: string
    currentVersionId?: string
    currentVersion?: number
  }): Document {
    const now = nowIso()
    const row = {
      id: input.id ?? createId("document"),
      title: input.title,
      description: input.description ?? null,
      documentType: input.documentType,
      contentFormat: input.contentFormat ?? "markdown",
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
    return mapDocument(row)
  }

  createWithInitialVersion(input: {
    id?: string
    versionId?: string
    title: string
    description?: string
    documentType: DocumentType
    contentFormat?: string
    mimeType: string
    sizeBytes: number
    storageKey: string
    previewText?: string
    metadata?: Record<string, unknown>
    visibilityScope?: DocumentVisibilityScope
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
  }): { document: Document; version: DocumentVersion } {
    const now = nowIso()
    const versionId = input.versionId ?? createId("document_version")
    const documentRow = {
      id: input.id ?? createId("document"),
      title: input.title,
      description: input.description ?? null,
      documentType: input.documentType,
      contentFormat: input.contentFormat ?? "markdown",
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
      currentVersionId: versionId,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    const versionRow = {
      id: versionId,
      documentId: documentRow.id,
      version: 1,
      contentHash: input.contentHash,
      contentStorageKey: input.contentStorageKey,
      changeSummary: input.changeSummary ?? null,
      createdByRunId: input.createdByRunId ?? null,
      createdByThreadId: input.createdByThreadId ?? null,
      createdAt: now,
    }

    this.db.transaction((tx) => {
      tx.insert(documents).values(documentRow).run()
      tx.insert(documentVersions).values(versionRow).run()
    })

    return {
      document: mapDocument(documentRow),
      version: mapDocumentVersion(versionRow),
    }
  }

  createVersion(input: {
    id?: string
    documentId: string
    version: number
    contentHash: string
    contentStorageKey: string
    changeSummary?: string
    createdByRunId?: string
    createdByThreadId?: string
  }): DocumentVersion {
    const row = {
      id: input.id ?? createId("document_version"),
      documentId: input.documentId,
      version: input.version,
      contentHash: input.contentHash,
      contentStorageKey: input.contentStorageKey,
      changeSummary: input.changeSummary ?? null,
      createdByRunId: input.createdByRunId ?? null,
      createdByThreadId: input.createdByThreadId ?? null,
      createdAt: nowIso(),
    }
    this.db.insert(documentVersions).values(row).run()
    return mapDocumentVersion(row)
  }

  updateVisibilityScope(input: {
    documentId: string
    visibilityScope: DocumentVisibilityScope
    projectId?: string | null
    projectNameSnapshot?: string | null
    threadId?: string | null
    threadTitleSnapshot?: string | null
  }): Document | null {
    const existing = this.getById(input.documentId)
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
      .where(eq(documents.id, input.documentId))
      .run()

    return this.getById(input.documentId)
  }

  updateCurrentVersion(input: {
    documentId: string
    versionId: string
    version: number
    storageKey: string
    sizeBytes: number
    previewText?: string
  }): Document | null {
    this.db
      .update(documents)
      .set({
        currentVersionId: input.versionId,
        currentVersion: input.version,
        storageKey: input.storageKey,
        sizeBytes: input.sizeBytes,
        previewText: input.previewText ?? null,
        updatedAt: nowIso(),
      })
      .where(eq(documents.id, input.documentId))
      .run()
    return this.getById(input.documentId)
  }

  updateWithVersion(input: {
    documentId: string
    version: number
    versionId?: string
    contentHash: string
    contentStorageKey: string
    changeSummary?: string
    createdByRunId?: string
    createdByThreadId?: string
    sizeBytes: number
    previewText?: string
  }): Document | null {
    const versionRow = {
      id: input.versionId ?? createId("document_version"),
      documentId: input.documentId,
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
      tx.insert(documentVersions).values(versionRow).run()
      tx.update(documents)
        .set({
          currentVersionId: versionRow.id,
          currentVersion: input.version,
          storageKey: input.contentStorageKey,
          sizeBytes: input.sizeBytes,
          previewText: input.previewText ?? null,
          updatedAt: nowIso(),
        })
        .where(eq(documents.id, input.documentId))
        .run()
      row = tx
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .get()
    })

    return row ? mapDocument(row) : null
  }

  getById(id: string): Document | null {
    const row = this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), markdownDocumentTypeCondition()))
      .get()
    return row ? mapDocument(row) : null
  }

  getVersion(documentId: string, version: number): DocumentVersion | null {
    const row = this.db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, documentId),
          eq(documentVersions.version, version)
        )
      )
      .get()
    return row ? mapDocumentVersion(row) : null
  }

  listVersions(documentId: string): DocumentVersion[] {
    return this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(documentVersions.version)
      .all()
      .map(mapDocumentVersion)
  }

  list(filters: DocumentListFilters = {}): Document[] {
    const conditions = [markdownDocumentTypeCondition()]
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
      return query.all().map(mapDocument)
    }

    return query
      .where(and(...conditions))
      .all()
      .map(mapDocument)
  }

  count(): number {
    const row = this.db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .get()
    return Number(row?.count ?? 0)
  }

  countByThreadIds(threadIds: string[]): Map<string, number> {
    if (threadIds.length === 0) return new Map()

    const rows = this.db
      .select({ threadId: documents.threadId, value: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          inArray(documents.threadId, threadIds),
          markdownDocumentTypeCondition()
        )
      )
      .groupBy(documents.threadId)
      .all()

    return new Map(
      rows.flatMap((row) =>
        row.threadId ? [[row.threadId, Number(row.value)] as const] : []
      )
    )
  }
}
