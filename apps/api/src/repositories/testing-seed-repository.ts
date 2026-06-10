import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { inArray, or, sql } from "drizzle-orm"
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core"
import type { AppConfig } from "../config.js"
import type { AppDatabase } from "../db/client.js"
import {
  agentConfigurationVersions,
  agentPromotionDrafts,
  agents,
  documents,
  documentVersions,
  integrationConnections,
  learningSuggestions,
  messages,
  projectMemories,
  projects,
  runs,
  runSteps,
  rubrics,
  savedMemories,
  skills,
  threads,
  toolAccessGrants,
  workspaces,
} from "../db/schema.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"
import { createId } from "../lib/ids.js"
import {
  RICH_WORKSPACE,
  RICH_WORKSPACE_NO_INTEGRATIONS,
  agentDefinitions,
  agentIds,
  agentVersionIds,
  answersByThreadId,
  documentBodies,
  documentIds,
  documentRows,
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
import { WorkspaceRepository } from "./workspace-repository.js"
import {
  GENERIC_AGENTIS_WORKSPACE_ID,
  LOCAL_WORKSPACE_BACKEND_TYPE,
  workspaceBackendRef,
} from "../workspaces/constants.js"
import type {
  DebugDataResetResult,
  DebugDatasetSummary,
  DebugSeedCounts,
  DebugSeedResult,
} from "./testing-seed-types.js"
export type {
  DebugDatasetId,
  DebugDataResetResult,
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

  deleteAllData(): DebugDataResetResult {
    const storageKeys = this.db
      .select({ storageKey: documents.storageKey })
      .from(documents)
      .all()
      .map((document) => document.storageKey)

    this.db.transaction((tx) => {
      tx.delete(documents).run()
      tx.delete(learningSuggestions).run()
      tx.delete(skills).run()
      tx.delete(rubrics).run()
      tx.delete(toolAccessGrants).run()
      tx.delete(runSteps).run()
      tx.delete(runs).run()
      tx.delete(messages).run()
      tx.delete(agentPromotionDrafts).run()
      tx.delete(threads).run()
      tx.delete(agentConfigurationVersions).run()
      tx.delete(workspaces).run()
      tx.delete(agents).run()
      tx.delete(savedMemories).run()
      tx.delete(projectMemories).run()
      tx.delete(projects).run()
      tx.delete(integrationConnections).run()
    })

    const storage = this.getDocumentStorage()
    for (const storageKey of storageKeys) {
      storage?.delete(storageKey)
    }

    return { counts: this.countWorkspaceData() }
  }

  private getDocumentStorage(): LocalDocumentStorage | null {
    return this.config ? new LocalDocumentStorage(this.config) : null
  }

  private writeDemoWorkspaceFiles(): void {
    if (!this.config) return
    const filesRoot = join(
      this.config.storageRoot,
      workspaceBackendRef(GENERIC_AGENTIS_WORKSPACE_ID),
      "files"
    )
    mkdirSync(join(filesRoot, "notes"), { recursive: true })
    writeFileSync(
      join(filesRoot, "README.md"),
      "# Agentis demo workspace\n\nThis workspace contains deterministic files for native tool demos.\n",
      "utf8"
    )
    writeFileSync(
      join(filesRoot, "notes", "demo-workspace.md"),
      "# Demo workspace notes\n\nAsk Agentis what files are in its workspace to exercise native file tools.\n",
      "utf8"
    )
  }

  private countRows(table: AnySQLiteTable): number {
    const row = this.db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .get()
    return Number(row?.count ?? 0)
  }

  private countWorkspaceData(): DebugSeedCounts {
    return {
      agents: this.countRows(agents),
      projects: this.countRows(projects),
      threads: this.countRows(threads),
      documents: this.countRows(documents),
      savedMemories: this.countRows(savedMemories),
      projectMemories: this.countRows(projectMemories),
      integrationConnections: this.countRows(integrationConnections),
    }
  }

  private deleteRichWorkspace(): void {
    const richWorkspaceIds = agentIds.map((agentId) => `workspace_${agentId}`)
    const richThreadIds = Array.from(
      new Set([
        ...threadIds,
        ...this.db
          .select({ id: threads.id })
          .from(threads)
          .where(
            or(
              inArray(threads.agentId, agentIds),
              inArray(threads.workspaceId, richWorkspaceIds)
            )
          )
          .all()
          .map((thread) => thread.id),
      ])
    )
    const richRunIds = Array.from(
      new Set([
        ...runIds,
        ...this.db
          .select({ id: runs.id })
          .from(runs)
          .where(
            or(
              inArray(runs.threadId, richThreadIds),
              inArray(runs.agentId, agentIds)
            )
          )
          .all()
          .map((run) => run.id),
      ])
    )
    const richDocuments = this.db
      .select({ id: documents.id, storageKey: documents.storageKey })
      .from(documents)
      .where(
        or(
          inArray(documents.id, documentIds),
          inArray(documents.projectId, projectIds),
          inArray(documents.threadId, richThreadIds),
          inArray(documents.runId, richRunIds),
          inArray(documents.agentId, agentIds)
        )
      )
      .all()

    const storage = this.getDocumentStorage()
    for (const document of richDocuments) {
      storage?.delete(document.storageKey)
    }

    this.db.transaction((tx) => {
      tx.delete(documents)
        .where(
          inArray(
            documents.id,
            richDocuments.map((document) => document.id)
          )
        )
        .run()
      tx.delete(toolAccessGrants)
        .where(
          or(
            inArray(toolAccessGrants.id, grantIds),
            inArray(toolAccessGrants.scopeId, [...agentIds, ...richThreadIds]),
            inArray(toolAccessGrants.connectionId, connectionIds)
          )
        )
        .run()
      tx.delete(runSteps)
        .where(
          or(
            inArray(runSteps.id, stepIds),
            inArray(runSteps.runId, richRunIds)
          )
        )
        .run()
      tx.delete(runs).where(inArray(runs.id, richRunIds)).run()
      tx.delete(messages)
        .where(
          or(
            inArray(messages.id, messageIds),
            inArray(messages.threadId, richThreadIds)
          )
        )
        .run()
      tx.delete(agentPromotionDrafts)
        .where(inArray(agentPromotionDrafts.threadId, richThreadIds))
        .run()
      tx.delete(learningSuggestions)
        .where(
          or(
            inArray(learningSuggestions.sourceThreadId, richThreadIds),
            inArray(learningSuggestions.agentId, agentIds)
          )
        )
        .run()
      tx.delete(threads).where(inArray(threads.id, richThreadIds)).run()
      tx.delete(skills).where(inArray(skills.agentId, agentIds)).run()
      tx.delete(rubrics).where(inArray(rubrics.agentId, agentIds)).run()
      tx.delete(agentConfigurationVersions)
        .where(
          or(
            inArray(agentConfigurationVersions.id, agentVersionIds),
            inArray(agentConfigurationVersions.agentId, agentIds)
          )
        )
        .run()
      tx.delete(workspaces).where(inArray(workspaces.agentId, agentIds)).run()
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
    const storage = this.getDocumentStorage()
    for (const [storageKey, body] of Object.entries(documentBodies)) {
      storage?.write(storageKey, Buffer.from(body, "utf8"))
    }
    new WorkspaceRepository(this.db).ensureGenericAgentisWorkspace()
    this.writeDemoWorkspaceFiles()

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
        nativeToolsJson: JSON.stringify(["documents", "webSearch"]),
        createdAt: lastWeek,
      }))
      tx.insert(agentConfigurationVersions).values(versionRows).run()

      const workspaceRows = agentDefinitions.map((agent) => {
        const workspaceId = `workspace_${agent.id}`
        return {
          id: workspaceId,
          agentId: agent.id,
          name: `${agent.name} workspace`,
          backendType: LOCAL_WORKSPACE_BACKEND_TYPE,
          backendRef: workspaceBackendRef(workspaceId),
          status: "active",
          createdAt: lastWeek,
          updatedAt: now,
        }
      })
      tx.insert(workspaces).values(workspaceRows).run()

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

      tx.insert(threads)
        .values(
          threadRows.map((thread) => ({
            ...thread,
            workspaceId: `workspace_${thread.agentId}`,
          }))
        )
        .run()

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
        costBreakdownJson: null,
        evaluationJson: null,
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

      const seededDocuments = documentRows.map((document) => {
        const contentFormat =
          document.documentType === "markdown"
            ? "markdown"
            : document.mimeType.startsWith("text/")
              ? "text"
              : "binary"
        const base = {
          ...document,
          contentFormat,
          visibilityScope: document.projectId ? "project" : "global",
        } as const
        if (document.documentType !== "markdown") {
          return { document: base, version: null as null }
        }
        const body =
          documentBodies[document.storageKey] ?? document.previewText ?? ""
        const versionId = createId("document_version")
        return {
          document: {
            ...base,
            currentVersionId: versionId,
            currentVersion: 1,
          },
          version: {
            id: versionId,
            documentId: document.id,
            version: 1,
            contentHash: createHash("sha256").update(body).digest("hex"),
            contentStorageKey: document.storageKey,
            changeSummary: "Seeded initial version",
            createdByRunId: document.runId,
            createdByThreadId: document.threadId,
            createdAt: document.createdAt,
          },
        }
      })
      tx.insert(documents)
        .values(seededDocuments.map((entry) => entry.document))
        .run()
      const documentVersionRows = seededDocuments
        .map((entry) => entry.version)
        .filter((version): version is NonNullable<typeof version> => version != null)
      if (documentVersionRows.length > 0) {
        tx.insert(documentVersions).values(documentVersionRows).run()
      }
      tx.insert(savedMemories).values(savedMemoryRows).run()
    })
  }
}
