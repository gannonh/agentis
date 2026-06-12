import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router"
import type {
  CommandCenterCostBreakdownResponse,
  CommandCenterNeedsAttentionItem,
  CommandCenterRecentRun,
  CommandCenterRosterAgent,
  CommandCenterScoreTrendsResponse,
  CommandCenterSummary,
} from "@workspace/shared"
import {
  fetchCommandCenterCostBreakdown,
  fetchCommandCenterNeedsAttention,
  fetchCommandCenterRecentRuns,
  fetchCommandCenterRoster,
  fetchCommandCenterScoreTrends,
  fetchCommandCenterSummary,
} from "@/lib/api/command-center-client"

export type CommandCenterNeedsAttentionData = {
  items: CommandCenterNeedsAttentionItem[]
  totalCount: number
}

export type CommandCenterData = {
  summary: CommandCenterSummary | null
  roster: CommandCenterRosterAgent[]
  recentRuns: CommandCenterRecentRun[]
  needsAttention: CommandCenterNeedsAttentionData
  scoreTrends: CommandCenterScoreTrendsResponse | null
  costBreakdown: CommandCenterCostBreakdownResponse | null
}

export type CommandCenterSectionErrors = {
  summary?: string
  roster?: string
  recentRuns?: string
  needsAttention?: string
  scoreTrends?: string
  costBreakdown?: string
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
  const [
    summaryResult,
    rosterResult,
    recentRunsResult,
    needsAttentionResult,
    scoreTrendsResult,
    costBreakdownResult,
  ] = await Promise.allSettled([
    fetchCommandCenterSummary(),
    fetchCommandCenterRoster(),
    fetchCommandCenterRecentRuns(),
    fetchCommandCenterNeedsAttention(),
    fetchCommandCenterScoreTrends(),
    fetchCommandCenterCostBreakdown(),
  ])

  const data: CommandCenterData = {
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
    roster: rosterResult.status === "fulfilled" ? rosterResult.value : [],
    recentRuns:
      recentRunsResult.status === "fulfilled" ? recentRunsResult.value : [],
    needsAttention:
      needsAttentionResult.status === "fulfilled"
        ? needsAttentionResult.value
        : { items: [], totalCount: 0 },
    scoreTrends:
      scoreTrendsResult.status === "fulfilled" ? scoreTrendsResult.value : null,
    costBreakdown:
      costBreakdownResult.status === "fulfilled"
        ? costBreakdownResult.value
        : null,
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
  if (needsAttentionResult.status === "rejected") {
    sectionErrors.needsAttention = loadErrorMessage(
      needsAttentionResult.reason,
      "Failed to load needs-attention items"
    )
  }
  if (scoreTrendsResult.status === "rejected") {
    sectionErrors.scoreTrends = loadErrorMessage(
      scoreTrendsResult.reason,
      "Failed to load score trends"
    )
  }
  if (costBreakdownResult.status === "rejected") {
    sectionErrors.costBreakdown = loadErrorMessage(
      costBreakdownResult.reason,
      "Failed to load cost breakdown"
    )
  }

  return {
    data,
    sectionErrors,
    error:
      Object.keys(sectionErrors).length === 6
        ? "Failed to load command center metrics"
        : null,
  }
}

export function useCommandCenter() {
  const location = useLocation()
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] =
    useState<CommandCenterSectionErrors>({})
  const loading = loadedKey !== location.key
  const latestRequestIdRef = useRef(0)

  const applyLoadResult = useCallback((result: CommandCenterLoadResult) => {
    setData(result.data)
    setSectionErrors(result.sectionErrors)
    setError(result.error)
  }, [])

  const refresh = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setLoadedKey(null)
    setError(null)
    setSectionErrors({})
    const result = await fetchCommandCenterData()
    if (requestId !== latestRequestIdRef.current) return
    applyLoadResult(result)
    setLoadedKey(location.key)
  }, [applyLoadResult, location.key])

  useEffect(() => {
    const requestId = ++latestRequestIdRef.current
    void fetchCommandCenterData().then((result) => {
      if (requestId !== latestRequestIdRef.current) return
      applyLoadResult(result)
      setLoadedKey(location.key)
    })
    return () => {
      latestRequestIdRef.current += 1
    }
  }, [applyLoadResult, location.key])

  return { data, loading, error, sectionErrors, refresh }
}
