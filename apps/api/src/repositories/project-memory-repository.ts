import { desc, eq } from "drizzle-orm"
import type { ProjectMemory } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { projectMemories } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapProjectMemory } from "../lib/mappers.js"

export class ProjectMemoryRepository {
  constructor(private readonly db: AppDatabase) {}

  listByProjectId(projectId: string): ProjectMemory[] {
    return this.db
      .select()
      .from(projectMemories)
      .where(eq(projectMemories.projectId, projectId))
      .orderBy(desc(projectMemories.updatedAt))
      .all()
      .map(mapProjectMemory)
  }

  getById(id: string): ProjectMemory | null {
    const row = this.db
      .select()
      .from(projectMemories)
      .where(eq(projectMemories.id, id))
      .get()
    return row ? mapProjectMemory(row) : null
  }

  create(input: {
    projectId: string
    content: string
    enabled?: boolean
  }): ProjectMemory {
    const now = nowIso()
    const row = {
      id: createId("memory"),
      projectId: input.projectId,
      content: input.content,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(projectMemories).values(row).run()
    return mapProjectMemory(row)
  }

  update(
    id: string,
    patch: { content?: string; enabled?: boolean }
  ): ProjectMemory | null {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(projectMemories)
      .set({
        content: patch.content ?? existing.content,
        enabled: patch.enabled ?? existing.enabled,
        updatedAt,
      })
      .where(eq(projectMemories.id, id))
      .run()
    return this.getById(id)
  }

  delete(id: string): boolean {
    const existing = this.getById(id)
    if (!existing) return false
    this.db.delete(projectMemories).where(eq(projectMemories.id, id)).run()
    return true
  }

  belongsToProject(memoryId: string, projectId: string): boolean {
    const row = this.db
      .select({ projectId: projectMemories.projectId })
      .from(projectMemories)
      .where(eq(projectMemories.id, memoryId))
      .get()
    return row?.projectId === projectId
  }
}
