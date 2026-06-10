import { useCallback, useEffect, useState } from "react"
import type { AgentUsageResponse } from "@workspace/shared"
import { getAgentUsage } from "@/lib/api/agents-client"

type AgentUsageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; usage: AgentUsageResponse }
  | { status: "error"; message: string }

export function useAgentUsage(agentId: string | undefined, periodDays = 14) {
  const [state, setState] = useState<AgentUsageState>({ status: "idle" })

  const refresh = useCallback(async () => {
    if (!agentId) {
      setState({ status: "idle" })
      return
    }

    setState({ status: "loading" })
    try {
      const usage = await getAgentUsage(agentId, periodDays)
      setState({ status: "ready", usage })
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to load agent usage",
      })
    }
  }, [agentId, periodDays])

  useEffect(() => {
    queueMicrotask(() => void refresh())
  }, [refresh])

  return { state, refresh }
}
