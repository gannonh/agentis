import { useCallback, useEffect, useState } from "react"
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

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAgentSchedules(agentId)
      setSchedules(data)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load schedules"
      )
    } finally {
      setLoading(false)
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
