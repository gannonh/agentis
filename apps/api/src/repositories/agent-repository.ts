import type {
  AgentConfigurationVersionSummary,
  AgentListItem,
} from "@workspace/shared"
import { asc, count, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import {
  agentConfigurationVersions,
  agents,
  toolAccessGrants,
} from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type AgentRow = typeof agents.$inferSelect
type VersionRow = typeof agentConfigurationVersions.$inferSelect

function mapVersion(row: VersionRow): AgentConfigurationVersionSummary {
  return {
    id: row.id,
    agentId: row.agentId,
    version: row.version,
    systemPrompt: row.systemPrompt,
    model: row.model,
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currentConfigurationVersion,
    toolGrantCount,
  }
}

export class AgentRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    name: string
    description?: string | null
    systemPrompt: string
    model: string
  }): AgentListItem {
    const now = nowIso()
    const agentRow = {
      id: createId("agent"),
      name: input.name,
      description: input.description ?? null,
      systemPrompt: input.systemPrompt,
      model: input.model,
      createdAt: now,
      updatedAt: now,
    }
    const versionRow = {
      id: createId("agent_version"),
      agentId: agentRow.id,
      version: 1,
      systemPrompt: input.systemPrompt,
      model: input.model,
      createdAt: now,
    }

    this.db.transaction((tx) => {
      tx.insert(agents).values(agentRow).run()
      tx.insert(agentConfigurationVersions).values(versionRow).run()
    })

    return mapAgent(agentRow, mapVersion(versionRow), 0)
  }

  getById(id: string): AgentListItem | null {
    const row = this.db.select().from(agents).where(eq(agents.id, id)).get()
    if (!row) return null
    return mapAgent(row, this.getCurrentVersion(row.id), this.countToolGrants(row.id))
  }

  list(): AgentListItem[] {
    return this.db
      .select()
      .from(agents)
      .orderBy(asc(agents.name), asc(agents.createdAt), asc(agents.id))
      .all()
      .map((row) =>
        mapAgent(row, this.getCurrentVersion(row.id), this.countToolGrants(row.id))
      )
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

  private getCurrentVersion(agentId: string): AgentConfigurationVersionSummary {
    const version = this.db
      .select()
      .from(agentConfigurationVersions)
      .where(eq(agentConfigurationVersions.agentId, agentId))
      .orderBy(asc(agentConfigurationVersions.version))
      .get()

    if (!version) {
      throw new Error(`Agent ${agentId} has no configuration version`)
    }

    return mapVersion(version)
  }

  private countToolGrants(agentId: string): number {
    const result = this.db
      .select({ value: count() })
      .from(toolAccessGrants)
      .where(eq(toolAccessGrants.scopeId, agentId))
      .get()

    return result?.value ?? 0
  }
}
