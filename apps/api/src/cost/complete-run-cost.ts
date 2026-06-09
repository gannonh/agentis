import type { RunCostBreakdown, RunUsage } from "@workspace/shared"
import { buildCompletedRunCost } from "./run-cost-attribution.js"
import type { SearchWebOutput } from "@workspace/shared"

export function buildRunCostPatch(input: {
  model: string
  usage: RunUsage
  toolOutputs?: SearchWebOutput[]
  mockRuntime?: boolean
}): {
  cost: number
  costBreakdown: RunCostBreakdown
} {
  const { costUsd, costBreakdown } = buildCompletedRunCost(input)
  return { cost: costUsd, costBreakdown }
}
