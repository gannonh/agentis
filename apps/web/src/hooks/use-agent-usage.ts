import { useCallback, useEffect, useState } from "react"
import type { AgentUsageResponse } from "@workspace/shared"
import { getAgentUsage } from "@/lib/api/agents-client"

type AgentUsageState =
  | { status: "idle" }
  | { status: "loading"; agentId: string }
  | { status: "ready"; agentId: string; usage: AgentUsageResponse }
  | { status: "error"; agentId: string; message: string }

function usageErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load agent usage"
}

export function useAgentUsage(agentId: string | undefined, periodDays = 14) {
  const [state, setState] = useState<AgentUsageState>({ status: "idle" })

  const refresh = useCallback(async () => {
    if (!agentId) {
      return
    }

    setState({ status: "loading", agentId })
    try {
      const usage = await getAgentUsage(agentId, periodDays)
      setState({ status: "ready", agentId, usage })
    } catch (error) {
      setState({ status: "error", agentId, message: usageErrorMessage(error) })
    }
  }, [agentId, periodDays])

  useEffect(() => {
    if (!agentId) {
      return
    }

    let cancelled = false
    getAgentUsage(agentId, periodDays)
      .then((usage) => {
        if (!cancelled) {
          setState({ status: "ready", agentId, usage })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", agentId, message: usageErrorMessage(error) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [agentId, periodDays])

  const visibleState =
    agentId && state.status !== "idle" && state.agentId === agentId
      ? state
      : agentId
        ? ({ status: "loading", agentId } satisfies AgentUsageState)
        : ({ status: "idle" } satisfies AgentUsageState)

  return { state: visibleState, refresh }
}
