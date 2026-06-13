import { threadListSummaryFromMessages, type RunStatus } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export type ThreadListContext = {
  messageCount: number
  lastRunStatus?: RunStatus
  summary: string | null
  documentCount: number
}

export const EMPTY_THREAD_LIST_CONTEXT: ThreadListContext = {
  messageCount: 0,
  summary: null,
  documentCount: 0,
}

export function loadThreadListContext(
  repos: Repositories,
  threadIds: string[]
): Map<string, ThreadListContext> {
  if (threadIds.length === 0) return new Map()

  const messagesByThreadId = repos.messages.listByThreadIds(threadIds)
  const latestRuns = repos.runs.listLatestByThreadIds(threadIds)
  const documentCounts = repos.documents.countByThreadIds(threadIds)
  const contextByThreadId = new Map<string, ThreadListContext>()

  for (const threadId of threadIds) {
    const messages = messagesByThreadId.get(threadId) ?? []
    contextByThreadId.set(threadId, {
      messageCount: messages.length,
      lastRunStatus: latestRuns.get(threadId)?.status,
      summary: threadListSummaryFromMessages(messages),
      documentCount: documentCounts.get(threadId) ?? 0,
    })
  }

  return contextByThreadId
}
