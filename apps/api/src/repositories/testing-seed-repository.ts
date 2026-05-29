import { inArray } from "drizzle-orm"
import type { AppConfig } from "../config.js"
import type { AppDatabase } from "../db/client.js"
import {
  agentConfigurationVersions,
  agents,
  artifacts,
  integrationConnections,
  messages,
  projectMemories,
  projects,
  runs,
  runSteps,
  savedMemories,
  threads,
  toolAccessGrants,
} from "../db/schema.js"
import { LocalArtifactStorage } from "../artifacts/local-artifact-storage.js"
import {
  RICH_WORKSPACE,
  RICH_WORKSPACE_NO_INTEGRATIONS,
  agentDefinitions,
  agentIds,
  agentVersionIds,
  answersByThreadId,
  artifactBodies,
  artifactIds,
  artifactRows,
  connectionIds,
  connectionRows,
  countPayload,
  grantIds,
  lastWeek,
  messageIds,
  now,
  projectIds,
  projectMemoryIds,
  projectMemoryRows,
  projectRows,
  promptsByThreadId,
  resolveDataset,
  runIds,
  savedMemoryIds,
  savedMemoryRows,
  stepIds,
  threadIds,
  threadRows,
} from "./testing-seed-data.js"
import type {
  DebugDatasetSummary,
  DebugSeedResult,
} from "./testing-seed-types.js"
export type {
  DebugDatasetId,
  DebugDatasetSummary,
  DebugSeedCounts,
  DebugSeedResult,
} from "./testing-seed-types.js"

export class TestingSeedRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly config?: AppConfig
  ) {}

  listDatasets(): DebugDatasetSummary[] {
    return [RICH_WORKSPACE, RICH_WORKSPACE_NO_INTEGRATIONS]
  }

  seed(datasetId: string): DebugSeedResult | null {
    const resolved = resolveDataset(datasetId)
    if (!resolved) return null
    this.deleteRichWorkspace()
    this.insertRichWorkspace(resolved.includeIntegrations)
    return {
      dataset: resolved.dataset,
      counts: countPayload(resolved.includeIntegrations),
    }
  }

  delete(datasetId: string): DebugSeedResult | null {
    const resolved = resolveDataset(datasetId)
    if (!resolved) return null
    this.deleteRichWorkspace()
    return {
      dataset: resolved.dataset,
      counts: countPayload(resolved.includeIntegrations),
    }
  }

  private getArtifactStorage(): LocalArtifactStorage | null {
    return this.config ? new LocalArtifactStorage(this.config) : null
  }

  private deleteRichWorkspace(): void {
    const storage = this.getArtifactStorage()
    for (const artifact of artifactRows) {
      storage?.delete(artifact.storageKey)
    }

    this.db.transaction((tx) => {
      tx.delete(artifacts).where(inArray(artifacts.id, artifactIds)).run()
      tx.delete(toolAccessGrants)
        .where(inArray(toolAccessGrants.id, grantIds))
        .run()
      tx.delete(runSteps).where(inArray(runSteps.id, stepIds)).run()
      tx.delete(runs).where(inArray(runs.id, runIds)).run()
      tx.delete(messages).where(inArray(messages.id, messageIds)).run()
      tx.delete(threads).where(inArray(threads.id, threadIds)).run()
      tx.delete(agentConfigurationVersions)
        .where(inArray(agentConfigurationVersions.id, agentVersionIds))
        .run()
      tx.delete(agents).where(inArray(agents.id, agentIds)).run()
      tx.delete(savedMemories)
        .where(inArray(savedMemories.id, savedMemoryIds))
        .run()
      tx.delete(projectMemories)
        .where(inArray(projectMemories.id, projectMemoryIds))
        .run()
      tx.delete(projects).where(inArray(projects.id, projectIds)).run()
      tx.delete(integrationConnections)
        .where(inArray(integrationConnections.id, connectionIds))
        .run()
    })
  }

  private insertRichWorkspace(includeIntegrations: boolean): void {
    const storage = this.getArtifactStorage()
    for (const [storageKey, body] of Object.entries(artifactBodies)) {
      storage?.write(storageKey, Buffer.from(body, "utf8"))
    }

    this.db.transaction((tx) => {
      tx.insert(projects).values(projectRows).run()
      tx.insert(projectMemories).values(projectMemoryRows).run()
      if (includeIntegrations) {
        tx.insert(integrationConnections)
          .values(
            connectionRows.map((connection) => ({
              ...connection,
              userId: this.config?.composioUserId ?? connection.userId,
            }))
          )
          .run()
      }

      const agentRows = agentDefinitions.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        maxCostPerRunUsd: agent.maxCostPerRunUsd,
        sourceThreadId: agent.sourceThreadId,
        sourceThreadTitle: agent.sourceThreadTitle,
        sourceWorkflowJson: agent.sourceWorkflowJson,
        createdAt: lastWeek,
        updatedAt: now,
      }))
      tx.insert(agents).values(agentRows).run()

      const versionRows = agentDefinitions.map((agent) => ({
        id: agent.versionId,
        agentId: agent.id,
        version: 1,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        maxCostPerRunUsd: agent.maxCostPerRunUsd,
        toolGrantsJson: JSON.stringify(includeIntegrations ? agent.grants : []),
        createdAt: lastWeek,
      }))
      tx.insert(agentConfigurationVersions).values(versionRows).run()

      const agentGrantRows = includeIntegrations
        ? agentDefinitions.flatMap((agent) =>
            agent.grants.map((grant) => ({
              id: `seed_grant_${agent.id}_${grant.toolkitSlug}`,
              scopeType: "agent",
              scopeId: agent.id,
              toolkitSlug: grant.toolkitSlug,
              connectionId: grant.connectionId,
              createdAt: lastWeek,
            }))
          )
        : []
      if (agentGrantRows.length > 0) {
        tx.insert(toolAccessGrants).values(agentGrantRows).run()
      }

      tx.insert(threads).values(threadRows).run()

      const threadGrantRows = includeIntegrations
        ? threadRows.flatMap((thread) => {
            const agent = agentDefinitions.find(
              (item) => item.id === thread.agentId
            )
            return (agent?.grants ?? []).map((grant) => ({
              id: `seed_grant_${thread.id}_${grant.toolkitSlug}`,
              scopeType: "thread",
              scopeId: thread.id,
              toolkitSlug: grant.toolkitSlug,
              connectionId: grant.connectionId,
              createdAt: thread.createdAt,
            }))
          })
        : []
      if (threadGrantRows.length > 0) {
        tx.insert(toolAccessGrants).values(threadGrantRows).run()
      }

      const messageRows = threadRows.flatMap((thread) => {
        const suffix = thread.id.replace("seed_thread_", "")
        return [
          {
            id: `seed_msg_${suffix}_user`,
            threadId: thread.id,
            role: "user",
            partsJson: JSON.stringify([
              { type: "text", text: promptsByThreadId[thread.id] },
            ]),
            status: "completed",
            createdAt: thread.createdAt,
          },
          {
            id: `seed_msg_${suffix}_assistant`,
            threadId: thread.id,
            role: "assistant",
            partsJson: JSON.stringify([
              { type: "text", text: answersByThreadId[thread.id] },
            ]),
            status: "completed",
            createdAt: thread.updatedAt,
          },
        ]
      })
      tx.insert(messages).values(messageRows).run()

      const runRows = threadRows.map((thread) => ({
        id: `seed_run_${thread.id.replace("seed_thread_", "")}`,
        threadId: thread.id,
        status: thread.status === "finished" ? "completed" : "running",
        model: thread.model,
        agentId: thread.agentId,
        agentConfigurationVersionId: thread.agentConfigurationVersionId,
        startedAt: thread.createdAt,
        finishedAt: thread.status === "finished" ? thread.updatedAt : null,
        errorSummary: null,
        usageJson: JSON.stringify({
          promptTokens: 1200,
          completionTokens: 700,
          totalTokens: 1900,
        }),
        cost: 0.08,
      }))
      tx.insert(runs).values(runRows).run()

      const stepRows = threadRows.flatMap((thread) => {
        const suffix = thread.id.replace("seed_thread_", "")
        const runId = `seed_run_${suffix}`
        return [
          {
            id: `seed_step_${suffix}_queued`,
            runId,
            type: "queued",
            status: "completed",
            title: "Queued",
            payloadJson: null,
            createdAt: thread.createdAt,
            updatedAt: thread.createdAt,
          },
          {
            id: `seed_step_${suffix}_completed`,
            runId,
            type: thread.status === "finished" ? "completed" : "running",
            status: thread.status === "finished" ? "completed" : "running",
            title:
              thread.status === "finished"
                ? "Response completed"
                : "Drafting response",
            payloadJson: JSON.stringify({ scenario: "rich-agent-workspace" }),
            createdAt: thread.updatedAt,
            updatedAt: thread.updatedAt,
          },
        ]
      })
      tx.insert(runSteps).values(stepRows).run()

      tx.insert(artifacts).values(artifactRows).run()
      tx.insert(savedMemories).values(savedMemoryRows).run()
    })
  }
}
