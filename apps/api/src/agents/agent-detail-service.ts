import {
  agentDetailResponseSchema,
  agentRecentThreadSummarySchema,
  type AgentDetailResponse,
} from "@workspace/shared"
import { toPublicArtifact } from "../lib/public-artifacts.js"
import {
  EMPTY_THREAD_LIST_CONTEXT,
  loadThreadListContext,
} from "../lib/thread-list-context.js"
import type { Repositories } from "../repositories/index.js"

export function buildAgentDetail(
  repos: Repositories,
  agentId: string
): AgentDetailResponse | null {
  const agent = repos.agents.getById(agentId)
  if (!agent) return null

  const libraryItems = repos.artifacts.list({ agentId }).map(toPublicArtifact)
  const threads = repos.threads.listByAgentId(agentId, { limit: 10 })
  const contextByThreadId = loadThreadListContext(
    repos,
    threads.map((thread) => thread.id)
  )
  const recentThreads = threads.map((thread) => {
    const scheduleSource =
      repos.agentInvocationRuns.getScheduleSourceByThreadId(thread.id)
    const webhookSource =
      repos.agentInvocationRuns.getWebhookSourceByThreadId(thread.id)
    return agentRecentThreadSummarySchema.parse({
      ...thread,
      ...(contextByThreadId.get(thread.id) ?? EMPTY_THREAD_LIST_CONTEXT),
      invocationSource: scheduleSource
        ? {
            type: "schedule" as const,
            scheduleId: scheduleSource.scheduleId,
            scheduleName: scheduleSource.scheduleName,
          }
        : webhookSource
          ? {
              type: "webhook" as const,
              webhookId: webhookSource.webhookId,
              webhookName: webhookSource.webhookName,
              deliveryId: webhookSource.deliveryId,
            }
          : undefined,
    })
  })

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
      hasEnabledSchedules: repos.agentSchedules.hasEnabledSchedules(agentId),
      hasEnabledWebhooks: repos.agentWebhooks.hasEnabledWebhooks(agentId),
    },
  })
}
