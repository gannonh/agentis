import { useCallback, useEffect, useRef, useState } from "react"
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
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!agentId) {
      return
    }

    const requestId = ++requestIdRef.current
    setState({ status: "loading", agentId })
    try {
      const usage = await getAgentUsage(agentId, periodDays)
      if (requestId !== requestIdRef.current) {
        return
      }
      setState({ status: "ready", agentId, usage })
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }
      setState({ status: "error", agentId, message: usageErrorMessage(error) })
    }
  }, [agentId, periodDays])

  useEffect(() => {
    if (!agentId) {
      requestIdRef.current += 1
      return
    }

    const requestId = ++requestIdRef.current
    getAgentUsage(agentId, periodDays)
      .then((usage) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setState({ status: "ready", agentId, usage })
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setState({ status: "error", agentId, message: usageErrorMessage(error) })
      })

    return () => {
      requestIdRef.current += 1
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
