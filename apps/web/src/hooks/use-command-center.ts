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

type CommandCenterLoadResult = {
  data: CommandCenterData
  sectionErrors: CommandCenterSectionErrors
  error: string | null
}

function loadErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function fetchCommandCenterData(): Promise<CommandCenterLoadResult> {
  const [summaryResult, rosterResult, recentRunsResult] =
    await Promise.allSettled([
      fetchCommandCenterSummary(),
      fetchCommandCenterRoster(),
      fetchCommandCenterRecentRuns(),
    ])

  const data: CommandCenterData = {
    summary:
      summaryResult.status === "fulfilled" ? summaryResult.value : null,
    roster: rosterResult.status === "fulfilled" ? rosterResult.value : [],
    recentRuns:
      recentRunsResult.status === "fulfilled" ? recentRunsResult.value : [],
  }
  const sectionErrors: CommandCenterSectionErrors = {}

  if (summaryResult.status === "rejected") {
    sectionErrors.summary = loadErrorMessage(
      summaryResult.reason,
      "Failed to load command center summary"
    )
  }
  if (rosterResult.status === "rejected") {
    sectionErrors.roster = loadErrorMessage(
      rosterResult.reason,
      "Failed to load agent roster metrics"
    )
  }
  if (recentRunsResult.status === "rejected") {
    sectionErrors.recentRuns = loadErrorMessage(
      recentRunsResult.reason,
      "Failed to load recent runs"
    )
  }

  return {
    data,
    sectionErrors,
    error:
      Object.keys(sectionErrors).length === 3
        ? "Failed to load command center metrics"
        : null,
  }
}

export function useCommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] =
    useState<CommandCenterSectionErrors>({})

  const applyLoadResult = useCallback((result: CommandCenterLoadResult) => {
    setData(result.data)
    setSectionErrors(result.sectionErrors)
    setError(result.error)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSectionErrors({})
    const result = await fetchCommandCenterData()
    applyLoadResult(result)
    setLoading(false)
  }, [applyLoadResult])

  useEffect(() => {
    let cancelled = false

    void fetchCommandCenterData().then((result) => {
      if (cancelled) return
      applyLoadResult(result)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [applyLoadResult])

  return { data, loading, error, sectionErrors, refresh }
}
