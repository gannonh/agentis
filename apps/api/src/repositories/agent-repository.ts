import type {
  AgentConfigurationVersionSummary,
  AgentListItem,
} from "@workspace/shared"
import { and, asc, count, desc, eq, inArray } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import {
  agentConfigurationVersions,
  agents,
  toolAccessGrants,
} from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type AgentRow = typeof agents.$inferSelect
type VersionRow = typeof agentConfigurationVersions.$inferSelect

type AgentCreateInput = {
  name: string
  description?: string | null
  systemPrompt: string
  model: string
  maxCostPerRunUsd?: number | null
}

type AgentToolGrantCreateInput = {
  toolkitSlug: string
  connectionId: string
}

type AgentUpdateInput = {
  name?: string
  description?: string | null
  systemPrompt?: string
  model?: string
  maxCostPerRunUsd?: number | null
  toolGrants?: AgentToolGrantCreateInput[]
}

function normalizeGrants(
  grants: AgentToolGrantCreateInput[]
): AgentToolGrantCreateInput[] {
  return [...grants]
    .map((grant) => ({
      toolkitSlug: grant.toolkitSlug,
      connectionId: grant.connectionId,
    }))
    .sort(
      (a, b) =>
        a.toolkitSlug.localeCompare(b.toolkitSlug) ||
        a.connectionId.localeCompare(b.connectionId)
    )
}

function grantsMatch(
  currentGrants: AgentToolGrantCreateInput[],
  nextGrants: AgentToolGrantCreateInput[]
): boolean {
  if (currentGrants.length !== nextGrants.length) return false
  return currentGrants.every(
    (grant, index) =>
      grant.toolkitSlug === nextGrants[index]?.toolkitSlug &&
      grant.connectionId === nextGrants[index]?.connectionId
  )
}

function mapVersion(row: VersionRow): AgentConfigurationVersionSummary {
  return {
    id: row.id,
    agentId: row.agentId,
    version: row.version,
    systemPrompt: row.systemPrompt,
    model: row.model,
    maxCostPerRunUsd: row.maxCostPerRunUsd,
    createdAt: row.createdAt,
  }
}

function mapAgent(
  row: AgentRow,
  currentConfigurationVersion: AgentConfigurationVersionSummary,
  toolGrantCount: number
): AgentListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    systemPrompt: row.systemPrompt,
    model: row.model,
    maxCostPerRunUsd: row.maxCostPerRunUsd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currentConfigurationVersion,
    toolGrantCount,
  }
}

export class AgentRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: AgentCreateInput): AgentListItem {
    return this.createWithGrants(input, [])
  }

  createWithGrants(
    input: AgentCreateInput,
    grants: AgentToolGrantCreateInput[]
  ): AgentListItem {
    const now = nowIso()
    const agentRow = {
      id: createId("agent"),
      name: input.name,
      description: input.description ?? null,
      systemPrompt: input.systemPrompt,
      model: input.model,
      maxCostPerRunUsd: input.maxCostPerRunUsd ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const versionRow = {
      id: createId("agent_version"),
      agentId: agentRow.id,
      version: 1,
      systemPrompt: input.systemPrompt,
      model: input.model,
      maxCostPerRunUsd: input.maxCostPerRunUsd ?? null,
      createdAt: now,
    }
    const grantRows = grants.map((grant) => ({
      id: createId("grant"),
      scopeType: "agent",
      scopeId: agentRow.id,
      toolkitSlug: grant.toolkitSlug,
      connectionId: grant.connectionId,
      createdAt: now,
    }))

    this.db.transaction((tx) => {
      tx.insert(agents).values(agentRow).run()
      tx.insert(agentConfigurationVersions).values(versionRow).run()
      for (const grantRow of grantRows) {
        tx.insert(toolAccessGrants).values(grantRow).run()
      }
    })

    return mapAgent(agentRow, mapVersion(versionRow), grantRows.length)
  }

  getById(id: string): AgentListItem | null {
    const row = this.db.select().from(agents).where(eq(agents.id, id)).get()
    if (!row) return null
    return mapAgent(
      row,
      this.getCurrentVersion(row.id),
      this.countToolGrants(row.id)
    )
  }

  list(): AgentListItem[] {
    const rows = this.db
      .select()
      .from(agents)
      .orderBy(asc(agents.name), asc(agents.createdAt), asc(agents.id))
      .all()
    if (rows.length === 0) return []

    const agentIds = rows.map((row) => row.id)
    const currentVersions = this.getCurrentVersions(agentIds)
    const toolGrantCounts = this.countToolGrantsByAgent(agentIds)

    return rows.map((row) => {
      const currentVersion = currentVersions.get(row.id)
      if (!currentVersion) {
        throw new Error(`Agent ${row.id} has no configuration version`)
      }
      return mapAgent(row, currentVersion, toolGrantCounts.get(row.id) ?? 0)
    })
  }

  listConfigurationVersions(
    agentId: string
  ): AgentConfigurationVersionSummary[] {
    return this.db
      .select()
      .from(agentConfigurationVersions)
      .where(eq(agentConfigurationVersions.agentId, agentId))
      .orderBy(asc(agentConfigurationVersions.version))
      .all()
      .map(mapVersion)
  }

  getConfigurationVersionById(
    versionId: string
  ): AgentConfigurationVersionSummary | null {
    const row = this.db
      .select()
      .from(agentConfigurationVersions)
      .where(eq(agentConfigurationVersions.id, versionId))
      .get()

    return row ? mapVersion(row) : null
  }

  update(agentId: string, input: AgentUpdateInput): AgentListItem | null {
    const existing = this.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .get()
    if (!existing) return null

    const currentVersion = this.getCurrentVersion(agentId)
    const nextName = input.name ?? existing.name
    const nextDescription =
      "description" in input
        ? (input.description ?? null)
        : existing.description
    const nextSystemPrompt = input.systemPrompt ?? existing.systemPrompt
    const nextModel = input.model ?? existing.model
    const nextMaxCostPerRunUsd =
      "maxCostPerRunUsd" in input
        ? (input.maxCostPerRunUsd ?? null)
        : existing.maxCostPerRunUsd
    const hasGrantEdit = input.toolGrants !== undefined
    const nextGrants = input.toolGrants ? normalizeGrants(input.toolGrants) : []
    const currentGrants = hasGrantEdit
      ? this.listAgentToolGrantInputs(agentId)
      : []
    const grantsChanged =
      hasGrantEdit && !grantsMatch(currentGrants, nextGrants)
    const identityChanged =
      nextName !== existing.name || nextDescription !== existing.description
    const configurationChanged =
      nextSystemPrompt !== existing.systemPrompt ||
      nextModel !== existing.model ||
      nextMaxCostPerRunUsd !== existing.maxCostPerRunUsd

    if (!identityChanged && !configurationChanged && !grantsChanged) {
      return mapAgent(
        existing,
        currentVersion,
        hasGrantEdit ? currentGrants.length : this.countToolGrants(agentId)
      )
    }

    const now = nowIso()

    this.db.transaction((tx) => {
      tx.update(agents)
        .set({
          name: nextName,
          description: nextDescription,
          systemPrompt: nextSystemPrompt,
          model: nextModel,
          maxCostPerRunUsd: nextMaxCostPerRunUsd,
          updatedAt: now,
        })
        .where(eq(agents.id, agentId))
        .run()

      if (hasGrantEdit && grantsChanged) {
        tx.delete(toolAccessGrants)
          .where(
            and(
              eq(toolAccessGrants.scopeType, "agent"),
              eq(toolAccessGrants.scopeId, agentId)
            )
          )
          .run()
        for (const grant of nextGrants) {
          tx.insert(toolAccessGrants)
            .values({
              id: createId("grant"),
              scopeType: "agent",
              scopeId: agentId,
              toolkitSlug: grant.toolkitSlug,
              connectionId: grant.connectionId,
              createdAt: now,
            })
            .run()
        }
      }

      if (configurationChanged) {
        tx.insert(agentConfigurationVersions)
          .values({
            id: createId("agent_version"),
            agentId,
            version: currentVersion.version + 1,
            systemPrompt: nextSystemPrompt,
            model: nextModel,
            maxCostPerRunUsd: nextMaxCostPerRunUsd,
            createdAt: now,
          })
          .run()
      }
    })

    return this.getById(agentId)
  }

  private getCurrentVersion(agentId: string): AgentConfigurationVersionSummary {
    const version = this.db
      .select()
      .from(agentConfigurationVersions)
      .where(eq(agentConfigurationVersions.agentId, agentId))
      .orderBy(desc(agentConfigurationVersions.version))
      .get()

    if (!version) {
      throw new Error(`Agent ${agentId} has no configuration version`)
    }

    return mapVersion(version)
  }

  private getCurrentVersions(
    agentIds: string[]
  ): Map<string, AgentConfigurationVersionSummary> {
    const rows = this.db
      .select()
      .from(agentConfigurationVersions)
      .where(inArray(agentConfigurationVersions.agentId, agentIds))
      .orderBy(
        asc(agentConfigurationVersions.agentId),
        desc(agentConfigurationVersions.version)
      )
      .all()

    const versions = new Map<string, AgentConfigurationVersionSummary>()
    for (const row of rows) {
      if (!versions.has(row.agentId)) {
        versions.set(row.agentId, mapVersion(row))
      }
    }
    return versions
  }

  private listAgentToolGrantInputs(
    agentId: string
  ): AgentToolGrantCreateInput[] {
    return normalizeGrants(
      this.db
        .select({
          toolkitSlug: toolAccessGrants.toolkitSlug,
          connectionId: toolAccessGrants.connectionId,
        })
        .from(toolAccessGrants)
        .where(
          and(
            eq(toolAccessGrants.scopeType, "agent"),
            eq(toolAccessGrants.scopeId, agentId)
          )
        )
        .all()
    )
  }

  private countToolGrants(agentId: string): number {
    const result = this.db
      .select({ value: count() })
      .from(toolAccessGrants)
      .where(
        and(
          eq(toolAccessGrants.scopeType, "agent"),
          eq(toolAccessGrants.scopeId, agentId)
        )
      )
      .get()

    return result?.value ?? 0
  }

  private countToolGrantsByAgent(agentIds: string[]): Map<string, number> {
    const rows = this.db
      .select({ scopeId: toolAccessGrants.scopeId, value: count() })
      .from(toolAccessGrants)
      .where(
        and(
          eq(toolAccessGrants.scopeType, "agent"),
          inArray(toolAccessGrants.scopeId, agentIds)
        )
      )
      .groupBy(toolAccessGrants.scopeId)
      .all()

    return new Map(rows.map((row) => [row.scopeId, row.value]))
  }
}
