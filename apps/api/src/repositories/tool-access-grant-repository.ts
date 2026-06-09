import { and, asc, eq } from "drizzle-orm"
import type { ToolAccessGrant, ToolAccessScopeType } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { toolAccessGrants } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type GrantRow = typeof toolAccessGrants.$inferSelect

function mapGrant(row: GrantRow): ToolAccessGrant {
  return {
    id: row.id,
    scopeType: row.scopeType as ToolAccessScopeType,
    scopeId: row.scopeId,
    toolkitSlug: row.toolkitSlug,
    connectionId: row.connectionId,
    createdAt: row.createdAt,
  }
}

export class ToolAccessGrantRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    scopeType: ToolAccessScopeType
    scopeId: string
    toolkitSlug: string
    connectionId: string
  }): ToolAccessGrant {
    const row = {
      id: createId("grant"),
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      toolkitSlug: input.toolkitSlug,
      connectionId: input.connectionId,
      createdAt: nowIso(),
    }
    this.db.insert(toolAccessGrants).values(row).run()
    return mapGrant(row)
  }

  getById(id: string): ToolAccessGrant | null {
    const row = this.db
      .select()
      .from(toolAccessGrants)
      .where(eq(toolAccessGrants.id, id))
      .get()
    return row ? mapGrant(row) : null
  }

  listByScope(scopeType: ToolAccessScopeType, scopeId: string): ToolAccessGrant[] {
    return this.db
      .select()
      .from(toolAccessGrants)
      .where(
        and(
          eq(toolAccessGrants.scopeType, scopeType),
          eq(toolAccessGrants.scopeId, scopeId)
        )
      )
      .orderBy(asc(toolAccessGrants.toolkitSlug), asc(toolAccessGrants.createdAt), asc(toolAccessGrants.id))
      .all()
      .map(mapGrant)
  }

  getByScopeAndToolkit(
    scopeType: ToolAccessScopeType,
    scopeId: string,
    toolkitSlug: string
  ): ToolAccessGrant | null {
    const row = this.db
      .select()
      .from(toolAccessGrants)
      .where(
        and(
          eq(toolAccessGrants.scopeType, scopeType),
          eq(toolAccessGrants.scopeId, scopeId),
          eq(toolAccessGrants.toolkitSlug, toolkitSlug)
        )
      )
      .get()
    return row ? mapGrant(row) : null
  }

  delete(id: string): boolean {
    const existing = this.getById(id)
    if (!existing) return false
    this.db.delete(toolAccessGrants).where(eq(toolAccessGrants.id, id)).run()
    return true
  }

  hasAnyForConnection(connectionId: string): boolean {
    const row = this.db
      .select({ id: toolAccessGrants.id })
      .from(toolAccessGrants)
      .where(eq(toolAccessGrants.connectionId, connectionId))
      .get()
    return row !== undefined
  }
}
