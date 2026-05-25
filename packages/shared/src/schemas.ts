import { z } from "zod"

const nonEmptyString = z.string().min(1)
const nonNegativeNumber = z.number().nonnegative()
const nonNegativeInteger = z.number().int().nonnegative()

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
  agentId: z.string().nullable().optional(),
  agentNameSnapshot: z.string().nullable().optional(),
  agentConfigurationVersionId: z.string().nullable().optional(),
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
  agentId: z.string().nullable().optional(),
  agentConfigurationVersionId: z.string().nullable().optional(),
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
        .enum(["missing_api_key", "missing_redirect_base_url", "mock_enabled"])
        .optional(),
    })
    .optional(),
})

export const agentConfigurationVersionSummarySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  version: z.number().int().positive(),
  systemPrompt: z.string(),
  model: z.string(),
  maxCostPerRunUsd: nonNegativeNumber.nullable().optional(),
  createdAt: z.string(),
})

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  systemPrompt: z.string(),
  model: z.string(),
  maxCostPerRunUsd: nonNegativeNumber.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const agentListItemSchema = agentSchema.extend({
  currentConfigurationVersion: agentConfigurationVersionSummarySchema,
  toolGrantCount: nonNegativeInteger,
})

export const agentToolGrantInputSchema = z.object({
  toolkitSlug: nonEmptyString,
  connectionId: z.string().optional(),
})

export const createAgentRequestSchema = z.object({
  name: nonEmptyString,
  description: z.string().optional(),
  systemPrompt: nonEmptyString,
  model: z.string().optional(),
  toolGrants: z.array(agentToolGrantInputSchema).optional(),
})

export const updateAgentRequestSchema = z
  .object({
    name: nonEmptyString.optional(),
    description: z.string().nullable().optional(),
    systemPrompt: nonEmptyString.optional(),
    model: nonEmptyString.optional(),
    maxCostPerRunUsd: nonNegativeNumber.nullable().optional(),
    toolGrants: z.array(agentToolGrantInputSchema).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one agent edit field is required.",
  })

export const createAgentTestThreadRequestSchema = z.object({
  prompt: nonEmptyString,
})

export const createThreadRequestSchema = z.object({
  prompt: nonEmptyString,
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
  prompt: nonEmptyString,
})

export const updateThreadRequestSchema = z.object({
  projectId: z.string().nullable().optional(),
})

export const createFollowUpResponseSchema = z.object({
  message: messageSchema,
  run: runSchema,
})

export const projectStatusSchema = z.enum(["active", "archived"])

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  status: projectStatusSchema,
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const projectMemorySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  content: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const projectContextSummarySchema = z.object({
  project: projectSchema,
  goals: z.string().nullable().optional(),
  memories: z.array(projectMemorySchema),
  enabledMemoryCount: z.number(),
  truncated: z.boolean().optional(),
  empty: z.boolean().optional(),
})

export const createProjectRequestSchema = z.object({
  name: nonEmptyString,
  description: z.string().optional(),
  goals: z.string().optional(),
})

export const updateProjectRequestSchema = z.object({
  name: nonEmptyString.optional(),
  description: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
})

export const createProjectMemoryRequestSchema = z.object({
  content: nonEmptyString,
  enabled: z.boolean().optional(),
})

export const updateProjectMemoryRequestSchema = z.object({
  content: nonEmptyString.optional(),
  enabled: z.boolean().optional(),
})

export const artifactTypeSchema = z.enum([
  "document",
  "webpage",
  "image",
  "video",
  "table",
  "slides",
  "other",
])

export const artifactSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: artifactTypeSchema,
  mimeType: z.string(),
  sizeBytes: z.number(),
  storageKey: z.string(),
  previewText: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectNameSnapshot: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  threadTitleSnapshot: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  agentNameSnapshot: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** API responses omit internal storage paths. */
export const artifactPublicSchema = artifactSchema.omit({ storageKey: true })

export const listArtifactsQuerySchema = z.object({
  query: z.string().optional(),
  type: artifactTypeSchema.optional(),
  projectId: z.string().optional(),
  threadId: z.string().optional(),
})

export const threadDetailSchema = z.object({
  thread: threadSchema,
  messages: z.array(messageSchema),
  runs: z.array(runSchema),
  steps: z.array(runStepSchema),
  projectContext: projectContextSummarySchema.nullable().optional(),
})

export const threadListItemSchema = threadSchema.extend({
  messageCount: z.number().optional(),
  lastRunStatus: runStatusSchema.optional(),
  summary: z.string().nullable().optional(),
  artifactCount: z.number().optional(),
})

export const agentRecentThreadSummarySchema = threadListItemSchema
  .pick({
    id: true,
    title: true,
    status: true,
    model: true,
    agentConfigurationVersionId: true,
    createdAt: true,
    updatedAt: true,
    lastRunStatus: true,
    summary: true,
  })
  .extend({ artifactCount: nonNegativeInteger })

export const agentLibrarySummarySchema = z.object({
  items: z.array(artifactPublicSchema),
  totalCount: nonNegativeInteger,
})

export const agentDetailInformationSchema = z.object({
  recentThreads: z.array(agentRecentThreadSummarySchema),
  library: agentLibrarySummarySchema,
})

export const agentDetailResponseSchema = z.object({
  agent: agentListItemSchema,
  configurationVersions: z.array(agentConfigurationVersionSummarySchema),
  toolGrants: z.array(toolAccessGrantSchema),
  information: agentDetailInformationSchema,
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
export type AgentConfigurationVersionSummary = z.infer<
  typeof agentConfigurationVersionSummarySchema
>
export type Agent = z.infer<typeof agentSchema>
export type AgentListItem = z.infer<typeof agentListItemSchema>
export type AgentToolGrantInput = z.infer<typeof agentToolGrantInputSchema>
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>
export type UpdateAgentRequest = z.infer<typeof updateAgentRequestSchema>
export type CreateAgentTestThreadRequest = z.infer<
  typeof createAgentTestThreadRequestSchema
>
export type AgentRecentThreadSummary = z.infer<
  typeof agentRecentThreadSummarySchema
>
export type AgentLibrarySummary = z.infer<typeof agentLibrarySummarySchema>
export type AgentDetailInformation = z.infer<
  typeof agentDetailInformationSchema
>
export type AgentDetailResponse = z.infer<typeof agentDetailResponseSchema>
export type CreateThreadRequest = z.infer<typeof createThreadRequestSchema>
export type CreateThreadResponse = z.infer<typeof createThreadResponseSchema>
export type CreateFollowUpRequest = z.infer<typeof createFollowUpRequestSchema>
export type UpdateThreadRequest = z.infer<typeof updateThreadRequestSchema>
export type CreateFollowUpResponse = z.infer<
  typeof createFollowUpResponseSchema
>
export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type Project = z.infer<typeof projectSchema>
export type ProjectMemory = z.infer<typeof projectMemorySchema>
export type ProjectContextSummary = z.infer<typeof projectContextSummarySchema>
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>
export type CreateProjectMemoryRequest = z.infer<
  typeof createProjectMemoryRequestSchema
>
export type UpdateProjectMemoryRequest = z.infer<
  typeof updateProjectMemoryRequestSchema
>
export type ArtifactType = z.infer<typeof artifactTypeSchema>
export type Artifact = z.infer<typeof artifactSchema>
export type ArtifactPublic = z.infer<typeof artifactPublicSchema>
export type ListArtifactsQuery = z.infer<typeof listArtifactsQuerySchema>
export type ThreadDetail = z.infer<typeof threadDetailSchema>
export type ThreadListItem = z.infer<typeof threadListItemSchema>
export type AbortRunResponse = z.infer<typeof abortRunResponseSchema>
