import { useCallback, useEffect, useRef, useState } from "react"
import type {
  AgentSchedule,
  CreateAgentScheduleRequest,
  UpdateAgentScheduleRequest,
} from "@workspace/shared"
import {
  createAgentSchedule,
  deleteAgentSchedule,
  listAgentSchedules,
  updateAgentSchedule,
} from "@/lib/api/agents-client"

export function useAgentSchedules(agentId: string) {
  const [schedules, setSchedules] = useState<AgentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latestRefreshRequest = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++latestRefreshRequest.current
    setLoading(true)
    setError(null)
    try {
      const data = await listAgentSchedules(agentId)
      if (requestId !== latestRefreshRequest.current) return
      setSchedules(data)
    } catch (loadError) {
      if (requestId !== latestRefreshRequest.current) return
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load schedules"
      )
    } finally {
      if (requestId === latestRefreshRequest.current) {
        setLoading(false)
      }
    }
  }, [agentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createSchedule(body: CreateAgentScheduleRequest) {
    const created = await createAgentSchedule(agentId, body)
    setSchedules((current) => [created, ...current])
    return created
  }

  async function saveSchedule(
    scheduleId: string,
    body: UpdateAgentScheduleRequest
  ) {
    const updated = await updateAgentSchedule(agentId, scheduleId, body)
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.id === scheduleId ? updated : schedule
      )
    )
    return updated
  }

  async function removeSchedule(scheduleId: string) {
    await deleteAgentSchedule(agentId, scheduleId)
    setSchedules((current) =>
      current.filter((schedule) => schedule.id !== scheduleId)
    )
  }

  return {
    schedules,
    loading,
    error,
    refresh,
    createSchedule,
    saveSchedule,
    removeSchedule,
  }
}
