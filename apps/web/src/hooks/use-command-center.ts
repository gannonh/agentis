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
  summary: CommandCenterSummary | null
  roster: CommandCenterRosterAgent[]
  recentRuns: CommandCenterRecentRun[]
}

export type CommandCenterSectionErrors = {
  summary?: string
  roster?: string
  recentRuns?: string
}

function loadErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useCommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] =
    useState<CommandCenterSectionErrors>({})

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSectionErrors({})

    const [summaryResult, rosterResult, recentRunsResult] =
      await Promise.allSettled([
        fetchCommandCenterSummary(),
        fetchCommandCenterRoster(),
        fetchCommandCenterRecentRuns(),
      ])

    const nextData: CommandCenterData = {
      summary:
        summaryResult.status === "fulfilled" ? summaryResult.value : null,
      roster: rosterResult.status === "fulfilled" ? rosterResult.value : [],
      recentRuns:
        recentRunsResult.status === "fulfilled" ? recentRunsResult.value : [],
    }
    const nextSectionErrors: CommandCenterSectionErrors = {}

    if (summaryResult.status === "rejected") {
      nextSectionErrors.summary = loadErrorMessage(
        summaryResult.reason,
        "Failed to load command center summary"
      )
    }
    if (rosterResult.status === "rejected") {
      nextSectionErrors.roster = loadErrorMessage(
        rosterResult.reason,
        "Failed to load agent roster metrics"
      )
    }
    if (recentRunsResult.status === "rejected") {
      nextSectionErrors.recentRuns = loadErrorMessage(
        recentRunsResult.reason,
        "Failed to load recent runs"
      )
    }

    setData(nextData)
    setSectionErrors(nextSectionErrors)
    setError(
      Object.keys(nextSectionErrors).length === 3
        ? "Failed to load command center metrics"
        : null
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, sectionErrors, refresh }
}
