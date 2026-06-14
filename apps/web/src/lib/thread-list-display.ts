import {
  GENERIC_AGENTIS_AGENT_ID,
  type ThreadListItem,
} from "@workspace/shared"

type ThreadAgentSource = Pick<
  ThreadListItem,
  "agentId" | "agentNameSnapshot"
>

export function threadAgentDisplayName(
  thread: ThreadAgentSource
): string | null {
  if (thread.agentNameSnapshot) {
    return thread.agentNameSnapshot
  }

  if (thread.agentId === GENERIC_AGENTIS_AGENT_ID) {
    return "Agentis"
  }

  if (!thread.agentId) {
    return null
  }

  return null
}

type ThreadListStatusSource = Pick<
  ThreadListItem,
  "hasPendingApproval" | "lastRunStatus" | "status"
>

export function threadListStatusLabel(thread: ThreadListStatusSource): string {
  if (thread.hasPendingApproval) {
    return "Waiting"
  }

  const status = thread.lastRunStatus ?? thread.status

  if (status === "finished") {
    return "Finished"
  }

  return status
}
