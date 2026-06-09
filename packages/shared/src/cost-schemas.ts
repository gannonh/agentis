import { z } from "zod"

const nonNegativeNumber = z.number().nonnegative()

export const runCostLineItemSchema = z.object({
  category: z.enum(["model", "tool"]),
  provider: z.string(),
  model: z.string().optional(),
  toolName: z.string().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  credits: z.number().nonnegative().optional(),
  costUsd: nonNegativeNumber,
})

export const runCostBreakdownSchema = z.object({
  totalUsd: nonNegativeNumber,
  lineItems: z.array(runCostLineItemSchema),
})

export const agentUsageDailyTotalSchema = z.object({
  date: z.string(),
  costUsd: nonNegativeNumber,
  runCount: z.number().int().nonnegative(),
})

export const agentUsageByModelSchema = z.object({
  model: z.string(),
  costUsd: nonNegativeNumber,
  runCount: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
})

export const agentUsageResponseSchema = z.object({
  agentId: z.string(),
  periodDays: z.number().int().positive(),
  totalCostUsd: nonNegativeNumber,
  totalRuns: z.number().int().nonnegative(),
  daily: z.array(agentUsageDailyTotalSchema),
  byModel: z.array(agentUsageByModelSchema),
})

export const commandCenterSummarySchema = z.object({
  totalCostUsd: nonNegativeNumber,
  totalRuns: z.number().int().nonnegative(),
  activeRuns: z.number().int().nonnegative(),
  agentCount: z.number().int().nonnegative(),
})

export type RunCostLineItem = z.infer<typeof runCostLineItemSchema>
export type RunCostBreakdown = z.infer<typeof runCostBreakdownSchema>
export type AgentUsageResponse = z.infer<typeof agentUsageResponseSchema>
export type CommandCenterSummary = z.infer<typeof commandCenterSummarySchema>
