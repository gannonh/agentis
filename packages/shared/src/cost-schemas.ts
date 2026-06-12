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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  avgScore: z.number().min(0).max(100).nullable(),
  evaluatedRunCount: z.number().int().nonnegative(),
})

export const commandCenterRosterAgentSchema = z.object({
  agentId: z.string(),
  runCount: z.number().int().nonnegative(),
  totalCostUsd: nonNegativeNumber,
  lastRunAt: z.string().nullable(),
  activeRunCount: z.number().int().nonnegative(),
  avgScore: z.number().min(0).max(100).nullable(),
  evaluatedRunCount: z.number().int().nonnegative(),
})

export const commandCenterRosterResponseSchema = z.array(
  commandCenterRosterAgentSchema
)

export const commandCenterRecentRunSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  agentId: z.string().nullable(),
  title: z.string(),
  status: z.enum([
    "queued",
    "running",
    "tool-calling",
    "completed",
    "failed",
    "aborted",
  ]),
  costUsd: nonNegativeNumber,
  startedAt: z.string(),
  evaluationScore: z.number().min(0).max(100).nullable(),
})

export const commandCenterRecentRunsResponseSchema = z.array(
  commandCenterRecentRunSchema
)

export const commandCenterNeedsAttentionItemTypeSchema = z.enum([
  "failed_run",
  "pending_learning_suggestion",
  "low_score_run",
])

export const commandCenterNeedsAttentionSeveritySchema = z.enum([
  "warning",
  "critical",
])

export const commandCenterNeedsAttentionItemSchema = z.object({
  id: z.string(),
  type: commandCenterNeedsAttentionItemTypeSchema,
  title: z.string(),
  description: z.string(),
  tag: z.string(),
  severity: commandCenterNeedsAttentionSeveritySchema,
  createdAt: z.string(),
  href: z.string(),
  dismissible: z.boolean(),
  agentId: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  suggestionId: z.string().nullable().optional(),
  score: z.number().min(0).max(100).nullable().optional(),
})

export const commandCenterNeedsAttentionResponseSchema = z.object({
  items: z.array(commandCenterNeedsAttentionItemSchema),
  totalCount: z.number().int().nonnegative(),
})

export type RunCostLineItem = z.infer<typeof runCostLineItemSchema>
export type RunCostBreakdown = z.infer<typeof runCostBreakdownSchema>
export type AgentUsageResponse = z.infer<typeof agentUsageResponseSchema>
export type CommandCenterSummary = z.infer<typeof commandCenterSummarySchema>
export type CommandCenterRosterAgent = z.infer<
  typeof commandCenterRosterAgentSchema
>
export type CommandCenterRecentRun = z.infer<
  typeof commandCenterRecentRunSchema
>
export type CommandCenterNeedsAttentionItem = z.infer<
  typeof commandCenterNeedsAttentionItemSchema
>
export type CommandCenterNeedsAttentionResponse = z.infer<
  typeof commandCenterNeedsAttentionResponseSchema
>
