import { and, desc, eq, like, or, sql } from "drizzle-orm"
import type { Artifact, ArtifactType } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { artifacts } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapArtifact } from "../lib/mappers.js"

export type ArtifactListFilters = {
  query?: string
  type?: ArtifactType
  projectId?: string
  threadId?: string
  agentId?: string
}

export class ArtifactRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    title: string
    description?: string
    type: ArtifactType
    mimeType: string
    sizeBytes: number
    storageKey: string
    previewText?: string
    metadata?: Record<string, unknown>
    projectId?: string
    projectNameSnapshot?: string
    threadId?: string
    threadTitleSnapshot?: string
    runId?: string
    agentId?: string
    agentNameSnapshot?: string
  }): Artifact {
    const now = nowIso()
    const row = {
      id: createId("artifact"),
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      previewText: input.previewText ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      projectId: input.projectId ?? null,
      projectNameSnapshot: input.projectNameSnapshot ?? null,
      threadId: input.threadId ?? null,
      threadTitleSnapshot: input.threadTitleSnapshot ?? null,
      runId: input.runId ?? null,
      agentId: input.agentId ?? null,
      agentNameSnapshot: input.agentNameSnapshot ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(artifacts).values(row).run()
    return mapArtifact(row)
  }

  getById(id: string): Artifact | null {
    const row = this.db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, id))
      .get()
    return row ? mapArtifact(row) : null
  }

  list(filters: ArtifactListFilters = {}): Artifact[] {
    const conditions = []
    if (filters.type) {
      conditions.push(eq(artifacts.type, filters.type))
    }
    if (filters.projectId) {
      conditions.push(eq(artifacts.projectId, filters.projectId))
    }
    if (filters.threadId) {
      conditions.push(eq(artifacts.threadId, filters.threadId))
    }
    if (filters.agentId) {
      conditions.push(eq(artifacts.agentId, filters.agentId))
    }
    if (filters.query?.trim()) {
      const pattern = `%${filters.query.trim()}%`
      conditions.push(
        or(
          like(artifacts.title, pattern),
          like(artifacts.description, pattern),
          like(artifacts.projectNameSnapshot, pattern),
          like(artifacts.threadTitleSnapshot, pattern),
          like(artifacts.type, pattern)
        )!
      )
    }

    const query = this.db
      .select()
      .from(artifacts)
      .orderBy(desc(artifacts.createdAt))

    if (conditions.length === 0) {
      return query.all().map(mapArtifact)
    }

    return query.where(and(...conditions)).all().map(mapArtifact)
  }

  count(): number {
    const row = this.db
      .select({ count: sql<number>`count(*)` })
      .from(artifacts)
      .get()
    return Number(row?.count ?? 0)
  }
}
