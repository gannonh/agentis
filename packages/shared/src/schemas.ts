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

export const connectionStatusSchema = z.enum([
  "not_connected",
  "pending",
  "connected",
  "expired",
  "error",
])

export const toolAccessScopeTypeSchema = z.enum(["thread", "agent"])

export const integrationToolkitSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  featured: z.boolean(),
  status: connectionStatusSchema,
  connectedAccountCount: z.number(),
  availableTools: z.array(z.string()),
})

export const integrationConnectionSchema = z.object({
  id: z.string(),
  toolkitSlug: z.string(),
  composioConnectedAccountId: z.string().nullable().optional(),
  composioConnectionRequestId: z.string().nullable().optional(),
  status: connectionStatusSchema,
  accountLabel: z.string().nullable().optional(),
  scopes: z.array(z.string()).optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const toolAccessGrantSchema = z.object({
  id: z.string(),
  scopeType: toolAccessScopeTypeSchema,
  scopeId: z.string(),
  toolkitSlug: z.string(),
  connectionId: z.string(),
  createdAt: z.string(),
})

export const integrationsListResponseSchema = z.object({
  toolkits: z.array(integrationToolkitSchema),
  composioConfigured: z.boolean(),
  composioMockEnabled: z.boolean(),
})

export const connectIntegrationResponseSchema = z.object({
  connection: integrationConnectionSchema,
  redirectUrl: z.string(),
})

export const refreshIntegrationsResponseSchema = z.object({
  toolkits: z.array(integrationToolkitSchema),
})

export const threadToolGrantsResponseSchema = z.object({
  grants: z.array(toolAccessGrantSchema),
  availableToolkits: z.array(integrationToolkitSchema),
})

export const createToolGrantRequestSchema = z.object({
  toolkitSlug: z.string(),
  connectionId: z.string().optional(),
})

export const composioRemediationCodeSchema = z.enum([
  "composio_not_configured",
  "toolkit_not_connected",
  "toolkit_not_granted",
  "connection_pending",
  "connection_expired",
  "tool_execution_failed",
])

export const runtimeHealthSchema = z.object({
  available: z.boolean(),
  reason: z.enum(["api_unavailable", "missing_api_key"]).optional(),
  model: z.string().optional(),
  composio: z
    .object({
      available: z.boolean(),
      reason: z
        .enum([
          "missing_api_key",
          "missing_redirect_base_url",
          "mock_enabled",
        ])
        .optional(),
    })
    .optional(),
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
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>
export type ToolAccessScopeType = z.infer<typeof toolAccessScopeTypeSchema>
export type IntegrationToolkit = z.infer<typeof integrationToolkitSchema>
export type IntegrationConnection = z.infer<typeof integrationConnectionSchema>
export type ToolAccessGrant = z.infer<typeof toolAccessGrantSchema>
export type IntegrationsListResponse = z.infer<
  typeof integrationsListResponseSchema
>
export type ConnectIntegrationResponse = z.infer<
  typeof connectIntegrationResponseSchema
>
export type RefreshIntegrationsResponse = z.infer<
  typeof refreshIntegrationsResponseSchema
>
export type ThreadToolGrantsResponse = z.infer<
  typeof threadToolGrantsResponseSchema
>
export type CreateToolGrantRequest = z.infer<
  typeof createToolGrantRequestSchema
>
export type ComposioRemediationCode = z.infer<
  typeof composioRemediationCodeSchema
>
export type RuntimeHealth = z.infer<typeof runtimeHealthSchema>
export type CreateThreadRequest = z.infer<typeof createThreadRequestSchema>
export type CreateThreadResponse = z.infer<typeof createThreadResponseSchema>
export type CreateFollowUpRequest = z.infer<typeof createFollowUpRequestSchema>
export type CreateFollowUpResponse = z.infer<typeof createFollowUpResponseSchema>
export type ThreadDetail = z.infer<typeof threadDetailSchema>
export type ThreadListItem = z.infer<typeof threadListItemSchema>
export type AbortRunResponse = z.infer<typeof abortRunResponseSchema>
