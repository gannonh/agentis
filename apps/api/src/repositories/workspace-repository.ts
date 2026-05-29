import { asc, eq, isNull } from "drizzle-orm"
import { DEFAULT_OPENAI_MODEL, type Workspace } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import {
  agentConfigurationVersions,
  agents,
  threads,
  workspaces,
} from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapWorkspace } from "../lib/mappers.js"
import {
  GENERIC_AGENTIS_AGENT_ID,
  GENERIC_AGENTIS_AGENT_NAME,
  GENERIC_AGENTIS_WORKSPACE_ID,
  GENERIC_AGENTIS_WORKSPACE_NAME,
  LOCAL_WORKSPACE_BACKEND_TYPE,
  workspaceBackendRef,
} from "../workspaces/constants.js"

export type CreateDefaultWorkspaceInput = {
  agentId: string
  agentName: string
}

export class WorkspaceRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Workspace[] {
    return this.db
      .select()
      .from(workspaces)
      .orderBy(asc(workspaces.createdAt), asc(workspaces.id))
      .all()
      .map(mapWorkspace)
  }

  listByAgentId(agentId: string): Workspace[] {
    return this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.agentId, agentId))
      .orderBy(asc(workspaces.createdAt), asc(workspaces.id))
      .all()
      .map(mapWorkspace)
  }

  getById(id: string): Workspace | null {
    const row = this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .get()
    return row ? mapWorkspace(row) : null
  }

  getDefaultByAgentId(agentId: string): Workspace | null {
    const row = this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.agentId, agentId))
      .get()
    return row ? mapWorkspace(row) : null
  }

  createDefaultForAgent(input: CreateDefaultWorkspaceInput): Workspace {
    const existing = this.getDefaultByAgentId(input.agentId)
    if (existing) return existing

    const now = nowIso()
    const workspaceId = createId("workspace")
    const row = {
      id: workspaceId,
      agentId: input.agentId,
      name: `${input.agentName} workspace`,
      backendType: LOCAL_WORKSPACE_BACKEND_TYPE,
      backendRef: workspaceBackendRef(workspaceId),
      status: "active",
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(workspaces).values(row).run()
    return mapWorkspace(row)
  }

  updateStatus(id: string, status: Workspace["status"]): Workspace | null {
    const existing = this.getById(id)
    if (!existing) return null
    this.db
      .update(workspaces)
      .set({ status, updatedAt: nowIso() })
      .where(eq(workspaces.id, id))
      .run()
    return this.getById(id)
  }

  ensureGenericAgentisWorkspace(): Workspace {
    const workspace = this.ensureGenericRows()
    this.backfillThreadWorkspaces()
    return workspace
  }

  backfillThreadWorkspaces(): void {
    this.ensureGenericRows()
    const now = nowIso()

    this.db
      .update(threads)
      .set({
        agentId: GENERIC_AGENTIS_AGENT_ID,
        agentNameSnapshot: GENERIC_AGENTIS_AGENT_NAME,
        updatedAt: now,
      })
      .where(isNull(threads.agentId))
      .run()

    const legacyThreads = this.db
      .select({ id: threads.id, agentId: threads.agentId })
      .from(threads)
      .where(isNull(threads.workspaceId))
      .all()

    for (const legacyThread of legacyThreads) {
      const agentId = legacyThread.agentId ?? GENERIC_AGENTIS_AGENT_ID
      const workspace = this.getDefaultByAgentId(agentId) ??
        this.createWorkspaceForExistingAgent(agentId)
      this.db
        .update(threads)
        .set({ workspaceId: workspace.id, updatedAt: now })
        .where(eq(threads.id, legacyThread.id))
        .run()
    }
  }

  private ensureGenericRows(): Workspace {
    const now = nowIso()
    const existingAgent = this.db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.id, GENERIC_AGENTIS_AGENT_ID))
      .get()

    if (!existingAgent) {
      this.db
        .insert(agents)
        .values({
          id: GENERIC_AGENTIS_AGENT_ID,
          name: GENERIC_AGENTIS_AGENT_NAME,
          description: "General Agentis assistant.",
          systemPrompt:
            "You are Agentis, a helpful workspace assistant. Be concise.",
          model: DEFAULT_OPENAI_MODEL,
          maxCostPerRunUsd: null,
          sourceThreadId: null,
          sourceThreadTitle: null,
          sourceWorkflowJson: null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    const existingVersion = this.db
      .select({ id: agentConfigurationVersions.id })
      .from(agentConfigurationVersions)
      .where(eq(agentConfigurationVersions.agentId, GENERIC_AGENTIS_AGENT_ID))
      .get()

    if (!existingVersion) {
      this.db
        .insert(agentConfigurationVersions)
        .values({
          id: "agent_version_agentis_v1",
          agentId: GENERIC_AGENTIS_AGENT_ID,
          version: 1,
          systemPrompt:
            "You are Agentis, a helpful workspace assistant. Be concise.",
          model: DEFAULT_OPENAI_MODEL,
          maxCostPerRunUsd: null,
          toolGrantsJson: "[]",
          createdAt: now,
        })
        .run()
    }

    const existingWorkspace = this.getDefaultByAgentId(GENERIC_AGENTIS_AGENT_ID)
    if (existingWorkspace) return existingWorkspace

    const row = {
      id: GENERIC_AGENTIS_WORKSPACE_ID,
      agentId: GENERIC_AGENTIS_AGENT_ID,
      name: GENERIC_AGENTIS_WORKSPACE_NAME,
      backendType: LOCAL_WORKSPACE_BACKEND_TYPE,
      backendRef: workspaceBackendRef(GENERIC_AGENTIS_WORKSPACE_ID),
      status: "active",
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(workspaces).values(row).run()
    return mapWorkspace(row)
  }

  private createWorkspaceForExistingAgent(agentId: string): Workspace {
    const agent = this.db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.id, agentId))
      .get()
    if (!agent) {
      throw new Error(`Agent ${agentId} has no default workspace`)
    }
    return this.createDefaultForAgent({ agentId: agent.id, agentName: agent.name })
  }
}
