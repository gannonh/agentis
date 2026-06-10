import { useCallback, useEffect, useState } from "react"
import type {
  CommandCenterRecentRun,
  CommandCenterRosterAgent,
  CommandCenterSummary,
} from "@workspace/shared"
import {
  fetchCommandCenterRecentRuns,
  fetchCommandCenterRoster,
  fetchCommandCenterSummary,
} from "@/lib/api/command-center-client"

export type CommandCenterData = {
  summary: CommandCenterSummary
  roster: CommandCenterRosterAgent[]
  recentRuns: CommandCenterRecentRun[]
}

export function useCommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, roster, recentRuns] = await Promise.all([
        fetchCommandCenterSummary(),
        fetchCommandCenterRoster(),
        fetchCommandCenterRecentRuns(),
      ])
      setData({ summary, roster, recentRuns })
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load command center metrics"
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
