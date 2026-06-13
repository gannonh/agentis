import { and, desc, eq, like, or } from "drizzle-orm"
import type { Project, ProjectStatus } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { projects } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapProject } from "../lib/mappers.js"

export class ProjectRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    name: string
    description?: string
    goals?: string
  }): Project {
    const now = nowIso()
    const row = {
      id: createId("project"),
      name: input.name,
      description: input.description ?? null,
      goals: input.goals ?? null,
      status: "active" as ProjectStatus,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(projects).values(row).run()
    return mapProject(row)
  }

  getById(id: string): Project | null {
    const row = this.db.select().from(projects).where(eq(projects.id, id)).get()
    return row ? mapProject(row) : null
  }

  list(options?: { includeArchived?: boolean }): Project[] {
    const includeArchived = options?.includeArchived ?? false
    const query = this.db.select().from(projects).orderBy(desc(projects.updatedAt))
    if (!includeArchived) {
      return query
        .where(eq(projects.status, "active"))
        .all()
        .map(mapProject)
    }
    return query.all().map(mapProject)
  }

  search(query: string, limit: number): Project[] {
    const pattern = `%${query.trim()}%`
    return this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.status, "active"),
          or(
            like(projects.name, pattern),
            like(projects.description, pattern),
            like(projects.goals, pattern)
          )!
        )
      )
      .orderBy(desc(projects.updatedAt))
      .limit(limit)
      .all()
      .map(mapProject)
  }

  update(
    id: string,
    patch: {
      name?: string
      description?: string | null
      goals?: string | null
    }
  ): Project | null {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(projects)
      .set({
        name: patch.name ?? existing.name,
        description:
          patch.description !== undefined
            ? patch.description
            : (existing.description ?? null),
        goals:
          patch.goals !== undefined ? patch.goals : (existing.goals ?? null),
        updatedAt,
      })
      .where(eq(projects.id, id))
      .run()
    return this.getById(id)
  }

  archive(id: string): Project | null {
    const existing = this.getById(id)
    if (!existing || existing.status === "archived") return existing
    const archivedAt = nowIso()
    this.db
      .update(projects)
      .set({
        status: "archived",
        archivedAt,
        updatedAt: archivedAt,
      })
      .where(eq(projects.id, id))
      .run()
    return this.getById(id)
  }

  isActive(id: string): boolean {
    const row = this.db
      .select({ status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.status, "active")))
      .get()
    return Boolean(row)
  }
}
