import {
  commandCenterCostBreakdownResponseSchema,
  commandCenterNeedsAttentionResponseSchema,
  commandCenterRecentRunsResponseSchema,
  commandCenterRosterResponseSchema,
  commandCenterScoreTrendsResponseSchema,
  commandCenterSummarySchema,
  type CommandCenterCostBreakdownResponse,
  type CommandCenterNeedsAttentionResponse,
  type CommandCenterRecentRun,
  type CommandCenterRosterAgent,
  type CommandCenterScoreTrendsResponse,
  type CommandCenterSummary,
} from "@workspace/shared"
import { ApiError } from "@/lib/api/client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

async function parseJson<T>(
  response: Response,
  schema: {
    parse: (data: unknown) => T
  }
): Promise<T> {
  const data: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : response.statusText
    throw new ApiError(message, response.status)
  }
  if (data === undefined) {
    throw new ApiError("Invalid JSON response", 500)
  }
  return schema.parse(data)
}

export async function fetchCommandCenterSummary(): Promise<CommandCenterSummary> {
  const response = await fetch(`${API_BASE}/api/command-center/summary`)
  return parseJson(response, commandCenterSummarySchema)
}

export async function fetchCommandCenterRoster(): Promise<
  CommandCenterRosterAgent[]
> {
  const response = await fetch(`${API_BASE}/api/command-center/roster`)
  return parseJson(response, commandCenterRosterResponseSchema)
}

export async function fetchCommandCenterNeedsAttention(): Promise<CommandCenterNeedsAttentionResponse> {
  const response = await fetch(`${API_BASE}/api/command-center/needs-attention`)
  return parseJson(response, commandCenterNeedsAttentionResponseSchema)
}

export async function fetchCommandCenterRecentRuns(
  limit = 20
): Promise<CommandCenterRecentRun[]> {
  const response = await fetch(
    `${API_BASE}/api/command-center/recent-runs?limit=${encodeURIComponent(String(limit))}`
  )
  return parseJson(response, commandCenterRecentRunsResponseSchema)
}

export async function fetchCommandCenterScoreTrends(
  periodDays = 90
): Promise<CommandCenterScoreTrendsResponse> {
  const response = await fetch(
    `${API_BASE}/api/command-center/score-trends?periodDays=${encodeURIComponent(String(periodDays))}`
  )
  return parseJson(response, commandCenterScoreTrendsResponseSchema)
}

export async function fetchCommandCenterCostBreakdown(
  periodDays = 90
): Promise<CommandCenterCostBreakdownResponse> {
  const response = await fetch(
    `${API_BASE}/api/command-center/cost-breakdown?periodDays=${encodeURIComponent(String(periodDays))}`
  )
  return parseJson(response, commandCenterCostBreakdownResponseSchema)
}
