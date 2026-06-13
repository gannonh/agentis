import {
  agentDetailResponseSchema,
  threadListSummaryFromMessages,
  type AgentDetailResponse,
} from "@workspace/shared"
import { toPublicArtifact } from "../lib/public-artifacts.js"
import type { Repositories } from "../repositories/index.js"

export function buildAgentDetail(
  repos: Repositories,
  agentId: string
): AgentDetailResponse | null {
  const agent = repos.agents.getById(agentId)
  if (!agent) return null

  const libraryItems = repos.artifacts.list({ agentId }).map(toPublicArtifact)
  const threads = repos.threads.listByAgentId(agentId, { limit: 10 })
  const threadIds = threads.map((thread) => thread.id)
  const latestRuns = repos.runs.listLatestByThreadIds(threadIds)
  const documentCounts = repos.documents.countByThreadIds(threadIds)
  const recentThreads = threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    status: thread.status,
    model: thread.model,
    agentConfigurationVersionId: thread.agentConfigurationVersionId,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastRunStatus: latestRuns.get(thread.id)?.status,
    summary: threadListSummaryFromMessages(
      repos.messages.listByThreadId(thread.id)
    ),
    documentCount: documentCounts.get(thread.id) ?? 0,
  }))

  const memories = repos.savedMemories.listForAgent(agentId)

  return agentDetailResponseSchema.parse({
    agent,
    configurationVersions: repos.agents.listConfigurationVersions(agentId),
    toolGrants: repos.toolAccessGrants.listByScope("agent", agentId),
    information: {
      recentThreads,
      library: { items: libraryItems, totalCount: libraryItems.length },
      memories,
      evaluations: repos.runs.listEvaluationsForAgent(agentId),
    },
  })
}
