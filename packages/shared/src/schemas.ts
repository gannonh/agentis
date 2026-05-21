import { z } from "zod"

export const runStatusSchema = z.enum([
  "queued",
  "running",
  "tool-calling",
  "completed",
  "failed",
  "aborted",
])

export const threadStatusSchema = z.enum(["active", "finished", "failed"])

export const threadModeSchema = z.enum(["plan", "agent"])

export const messageRoleSchema = z.enum(["user", "assistant", "system"])

export const messageStatusSchema = z.enum([
  "pending",
  "streaming",
  "completed",
  "failed",
  "aborted",
])

export const messagePartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    toolName: z.string(),
    output: z.unknown(),
  }),
])

export const runStepTypeSchema = z.enum([
  "queued",
  "running",
  "reasoning",
  "tool-call",
  "tool-result",
  "error",
  "aborted",
  "completed",
])

export const runStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
])

export const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: threadStatusSchema,
  model: z.string(),
  mode: threadModeSchema,
  projectId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const messageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: messageRoleSchema,
  parts: z.array(messagePartSchema),
  status: messageStatusSchema,
  createdAt: z.string(),
})

export const runUsageSchema = z.object({
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
})

export const runSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  status: runStatusSchema,
  model: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable().optional(),
  errorSummary: z.string().nullable().optional(),
  usage: runUsageSchema.nullable().optional(),
  cost: z.number().nullable().optional(),
})

export const runStepSchema = z.object({
  id: z.string(),
  runId: z.string(),
  type: runStepTypeSchema,
  status: runStepStatusSchema,
  title: z.string(),
  payload: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const runtimeHealthSchema = z.object({
  available: z.boolean(),
  reason: z.enum(["api_unavailable", "missing_api_key"]).optional(),
  model: z.string().optional(),
})

export const createThreadRequestSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().optional(),
  mode: threadModeSchema.optional(),
  projectId: z.string().optional(),
})

export const createThreadResponseSchema = z.object({
  thread: threadSchema,
  message: messageSchema,
  run: runSchema,
})

export const createFollowUpRequestSchema = z.object({
  prompt: z.string().min(1),
})

export const createFollowUpResponseSchema = z.object({
  message: messageSchema,
  run: runSchema,
})

export const threadDetailSchema = z.object({
  thread: threadSchema,
  messages: z.array(messageSchema),
  runs: z.array(runSchema),
  steps: z.array(runStepSchema),
})

export const threadListItemSchema = threadSchema.extend({
  messageCount: z.number().optional(),
  lastRunStatus: runStatusSchema.optional(),
})

export const abortRunResponseSchema = z.object({
  run: runSchema,
})

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

export type RunStatus = z.infer<typeof runStatusSchema>
export type ThreadStatus = z.infer<typeof threadStatusSchema>
export type ThreadMode = z.infer<typeof threadModeSchema>
export type MessageRole = z.infer<typeof messageRoleSchema>
export type MessageStatus = z.infer<typeof messageStatusSchema>
export type MessagePart = z.infer<typeof messagePartSchema>
export type RunStepType = z.infer<typeof runStepTypeSchema>
export type RunStepStatus = z.infer<typeof runStepStatusSchema>
export type Thread = z.infer<typeof threadSchema>
export type Message = z.infer<typeof messageSchema>
export type Run = z.infer<typeof runSchema>
export type RunUsage = z.infer<typeof runUsageSchema>
export type RunStep = z.infer<typeof runStepSchema>
export type RuntimeHealth = z.infer<typeof runtimeHealthSchema>
export type CreateThreadRequest = z.infer<typeof createThreadRequestSchema>
export type CreateThreadResponse = z.infer<typeof createThreadResponseSchema>
export type CreateFollowUpRequest = z.infer<typeof createFollowUpRequestSchema>
export type CreateFollowUpResponse = z.infer<typeof createFollowUpResponseSchema>
export type ThreadDetail = z.infer<typeof threadDetailSchema>
export type ThreadListItem = z.infer<typeof threadListItemSchema>
export type AbortRunResponse = z.infer<typeof abortRunResponseSchema>
