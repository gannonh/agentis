import {
  runStepsHavePendingApproval,
  threadListSummaryFromMessages,
  type RunStatus,
  type RunStep,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export type ThreadListContext = {
  messageCount: number
  lastRunStatus?: RunStatus
  summary: string | null
  documentCount: number
  hasPendingApproval: boolean
}

export const EMPTY_THREAD_LIST_CONTEXT: ThreadListContext = {
  messageCount: 0,
  summary: null,
  documentCount: 0,
  hasPendingApproval: false,
}

export function loadThreadListContext(
  repos: Repositories,
  threadIds: string[]
): Map<string, ThreadListContext> {
  if (threadIds.length === 0) return new Map()

  const messagesByThreadId = repos.messages.listByThreadIds(threadIds)
  const latestRuns = repos.runs.listLatestByThreadIds(threadIds)
  const documentCounts = repos.documents.countByThreadIds(threadIds)
  const latestRunIds = [...latestRuns.values()].map((run) => run.id)
  const stepsByRunId = new Map<string, RunStep[]>()

  for (const step of repos.steps.listByRunIds(latestRunIds)) {
    const runSteps = stepsByRunId.get(step.runId)
    if (runSteps) {
      runSteps.push(step)
    } else {
      stepsByRunId.set(step.runId, [step])
    }
  }

  const contextByThreadId = new Map<string, ThreadListContext>()

  for (const threadId of threadIds) {
    const messages = messagesByThreadId.get(threadId) ?? []
    const latestRun = latestRuns.get(threadId)
    const latestRunSteps = latestRun ? (stepsByRunId.get(latestRun.id) ?? []) : []

    contextByThreadId.set(threadId, {
      messageCount: messages.length,
      lastRunStatus: latestRun?.status,
      summary: threadListSummaryFromMessages(messages),
      documentCount: documentCounts.get(threadId) ?? 0,
      hasPendingApproval: runStepsHavePendingApproval(latestRunSteps),
    })
  }

  return contextByThreadId
}
