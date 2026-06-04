import { z } from "zod"
import { LOCAL_WORKSPACE_BACKEND_TYPE } from "./constants.js"
import {
  documentDetailResponseSchema,
  documentPublicSchema,
  documentSchema,
  documentSourceSchema,
  documentTypeSchema,
  documentVersionSchema,
  documentVersionSummarySchema,
  documentVisibilityScopeSchema,
  listDocumentsQuerySchema,
  updateDocumentContentRequestSchema,
  updateDocumentContentResponseSchema,
  updateDocumentVisibilityRequestSchema,
  updateDocumentVisibilityResponseSchema,
} from "./document-schemas.js"
import { nativeToolsSchema } from "./native-tools.js"
export { GENERIC_AGENTIS_AGENT_ID } from "./constants.js"
export {
  documentContentFormatSchema,
  documentDetailResponseSchema,
  documentPublicSchema,
  documentSchema,
  documentSourceSchema,
  documentTypeSchema,
  documentVersionSchema,
  documentVersionSummarySchema,
  documentVisibilityScopeSchema,
  listDocumentsQuerySchema,
  updateDocumentContentRequestSchema,
  updateDocumentContentResponseSchema,
  updateDocumentVisibilityRequestSchema,
  updateDocumentVisibilityResponseSchema,
} from "./document-schemas.js"

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

export const workspaceBackendTypeSchema = z.enum([LOCAL_WORKSPACE_BACKEND_TYPE])

export const workspaceStatusSchema = z.enum(["active", "archived"])

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
  z.object({
    type: z.literal("tool-error"),
    toolCallId: z.string(),
    toolName: z.string(),
    error: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
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

export const agentSourceThreadSchema = z.object({
  id: nonEmptyString,
  title: z.string(),
})

export const agentSourceWorkflowSchema = z.object({
  summary: nonEmptyString,
  firstUserPrompt: nonEmptyString.optional(),
})

export const workspaceSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: z.string(),
  backendType: workspaceBackendTypeSchema,
  backendRef: z.string(),
  status: workspaceStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: threadStatusSchema,
  model: z.string(),
  mode: threadModeSchema,
  projectId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional(),
  agentNameSnapshot: z.string().nullable().optional(),
  agentConfigurationVersionId: z.string().nullable().optional(),
  sourceThread: agentSourceThreadSchema.optional(),
  sourceWorkflow: agentSourceWorkflowSchema.optional(),
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
  aiGatewayProvider: z.enum(["vercel", "cloudflare"]).optional(),
  missingEnvVars: z.array(z.string()).optional(),
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
  nativeTools: nativeToolsSchema,
  createdAt: z.string(),
})

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  systemPrompt: z.string(),
  model: z.string(),
  maxCostPerRunUsd: nonNegativeNumber.nullable().optional(),
  sourceThread: agentSourceThreadSchema.optional(),
  sourceWorkflow: agentSourceWorkflowSchema.optional(),
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

export const agentToolGrantInputListSchema = z.array(agentToolGrantInputSchema)

export const toolGrantValidationStatusSchema = z.enum([
  "valid",
  "missing_access",
  "pending_connection",
  "unsupported",
])

export const unsupportedSourceStepReasonSchema = z.enum([
  "unsupported_tool",
  "incomplete_tool_call",
  "missing_metadata",
])

export const toolGrantRemediationSchema = z.object({
  code: composioRemediationCodeSchema,
  message: nonEmptyString,
  href: z.string().optional(),
})

export const agentPromotionDraftToolGrantProposalSchema = z.object({
  toolkitSlug: nonEmptyString,
  toolName: z.string().optional(),
  displayName: z.string().optional(),
  required: z.boolean(),
})

export const proposedToolGrantSchema =
  agentPromotionDraftToolGrantProposalSchema.extend({
    validationStatus: toolGrantValidationStatusSchema,
    connectionId: z.string().optional(),
    remediation: toolGrantRemediationSchema.optional(),
  })

export const unsupportedSourceStepSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  reason: unsupportedSourceStepReasonSchema,
  toolName: z.string().optional(),
  details: z.string().optional(),
})

export const createAgentRequestSchema = z.object({
  name: nonEmptyString,
  description: z.string().optional(),
  systemPrompt: nonEmptyString,
  model: z.string().optional(),
  toolGrants: agentToolGrantInputListSchema.optional(),
  nativeTools: nativeToolsSchema.optional(),
})

export const updateAgentRequestSchema = z
  .object({
    name: nonEmptyString.optional(),
    description: z.string().nullable().optional(),
    systemPrompt: nonEmptyString.optional(),
    model: nonEmptyString.optional(),
    maxCostPerRunUsd: nonNegativeNumber.nullable().optional(),
    toolGrants: z.array(agentToolGrantInputSchema).optional(),
    nativeTools: nativeToolsSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one agent edit field is required.",
  })

export const createAgentTestThreadRequestSchema = z.object({
  prompt: nonEmptyString,
})

export const agentPromotionDraftIntelligenceSchema = z.object({
  suggestedPurpose: z.string().optional(),
  repeatedSteps: z.array(nonEmptyString),
  requiredTools: z.array(agentToolGrantInputSchema),
  suggestedPrompt: nonEmptyString.optional(),
  modelRecommendation: z
    .object({
      model: nonEmptyString,
      reason: z.string().optional(),
    })
    .optional(),
  rubricCriteria: z.array(nonEmptyString),
})

export const updateAgentPromotionDraftIntelligenceSchema =
  agentPromotionDraftIntelligenceSchema
    .partial()
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one promotion draft intelligence field is required.",
    })

export const agentPromotionDraftEditedFieldSchema = z.enum([
  "name",
  "description",
  "systemPrompt",
  "model",
  "toolGrants",
  "suggestedPurpose",
  "repeatedSteps",
  "requiredTools",
  "suggestedPrompt",
  "modelRecommendation",
  "rubricCriteria",
])

export const agentPromotionDraftSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  sourceThreadTitle: z.string(),
  name: nonEmptyString,
  description: z.string().optional(),
  systemPrompt: nonEmptyString,
  model: nonEmptyString,
  sourceWorkflow: agentSourceWorkflowSchema.optional(),
  toolGrants: z.array(agentToolGrantInputSchema),
  intelligence: agentPromotionDraftIntelligenceSchema,
  editedFields: z.array(agentPromotionDraftEditedFieldSchema),
  proposedToolGrants: z.array(proposedToolGrantSchema).default([]),
  unsupportedSourceSteps: z.array(unsupportedSourceStepSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createAgentPromotionDraftResponseSchema = z.object({
  draft: agentPromotionDraftSchema,
})

export const updateAgentPromotionDraftRequestSchema = z
  .object({
    name: nonEmptyString.optional(),
    description: z.string().nullable().optional(),
    systemPrompt: nonEmptyString.optional(),
    model: nonEmptyString.optional(),
    toolGrants: z.array(agentToolGrantInputSchema).optional(),
    nativeTools: nativeToolsSchema.optional(),
    intelligence: updateAgentPromotionDraftIntelligenceSchema.optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one promotion draft field is required.",
  })

export const createAgentFromPromotionDraftRequestSchema =
  createAgentRequestSchema.extend({
    draftUpdates: updateAgentPromotionDraftRequestSchema.optional(),
  })

export const createThreadRequestSchema = z.object({
  prompt: nonEmptyString,
  model: z.string().optional(),
  mode: threadModeSchema.optional(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
})

export const createThreadResponseSchema = z.object({
  thread: threadSchema,
  message: messageSchema,
  run: runSchema,
})

export const createFollowUpRequestSchema = z.object({
  prompt: nonEmptyString,
  mode: threadModeSchema.optional(),
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

export const savedMemoryCategoryKeySchema = z.enum([
  "memory_category_user_fact",
  "memory_category_preference",
  "memory_category_project_context",
  "memory_category_domain_knowledge",
  "memory_category_people",
  "memory_category_active_work",
  "memory_category_tools_workflows",
  "memory_category_organization",
])

export const savedMemoryCategoryNameSchema = z.enum([
  "User Fact",
  "Preference",
  "Project Context",
  "Domain Knowledge",
  "People",
  "Active Work",
  "Tools & Workflows",
  "Organization",
])

export const savedMemoryImportanceSchema = z.enum(["low", "medium", "high"])

export const savedMemoryScopeSchema = z.enum(["global", "agent"])

export const savedMemorySourceSchema = z.enum([
  "thread-derived",
  "user-generated",
])

export const savedMemoryCategorySchema = z.object({
  id: savedMemoryCategoryKeySchema,
  name: savedMemoryCategoryNameSchema,
  description: z.string(),
  count: z.number().int().nonnegative(),
})

export const savedMemorySchema = z
  .object({
    id: z.string(),
    content: z.string(),
    category: savedMemoryCategoryKeySchema,
    usageGuidance: z.string(),
    tags: z.array(z.string()),
    importance: savedMemoryImportanceSchema,
    date: z.string(),
    scope: savedMemoryScopeSchema,
    associatedAgent: z.string().nullable().optional(),
    associatedAgents: z.array(z.string()).optional().default([]),
    source: savedMemorySourceSchema,
    sourceThreadId: z.string().nullable().optional(),
    sourceThreadTitle: z.string().nullable().optional(),
    provenance: z.string(),
    pinnedToContext: z.boolean().default(false),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((memory, ctx) => {
    if (
      memory.source === "thread-derived" &&
      (!memory.sourceThreadId || !memory.sourceThreadTitle)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thread-derived memories require source thread lineage",
        path: ["sourceThreadId"],
      })
    }

    if (
      memory.source === "user-generated" &&
      (memory.sourceThreadId || memory.sourceThreadTitle)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "User-generated memories cannot include source thread lineage",
        path: ["sourceThreadId"],
      })
    }
  })

export const createSavedMemoryRequestSchema = z.object({
  content: nonEmptyString,
  category: savedMemoryCategoryKeySchema,
  importance: savedMemoryImportanceSchema,
  usageGuidance: z.string().optional().default(""),
  tags: z.array(nonEmptyString).optional().default([]),
  scope: z.enum(["global", "agent"]),
  associatedAgent: z.string().optional(),
  associatedAgents: z.array(nonEmptyString).optional(),
  pinnedToContext: z.boolean().optional().default(false),
})

export const updateSavedMemoryRequestSchema =
  createSavedMemoryRequestSchema.partial()

export const memoriesListResponseSchema = z.object({
  categories: z.array(savedMemoryCategorySchema),
  memories: z.array(savedMemorySchema),
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
  documentCount: z.number().optional(),
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
  .extend({ documentCount: nonNegativeInteger })

export const agentLibrarySummarySchema = z.object({
  items: z.array(documentPublicSchema),
  totalCount: nonNegativeInteger,
})

export const agentMemorySummarySchema = z.object({
  agent: z.array(savedMemorySchema),
  global: z.array(savedMemorySchema),
})

export const agentDetailInformationSchema = z.object({
  recentThreads: z.array(agentRecentThreadSummarySchema),
  library: agentLibrarySummarySchema,
  memories: agentMemorySummarySchema.default({ agent: [], global: [] }),
})

export const agentDetailResponseSchema = z.object({
  agent: agentListItemSchema,
  configurationVersions: z.array(agentConfigurationVersionSummarySchema),
  toolGrants: z.array(toolAccessGrantSchema),
  information: agentDetailInformationSchema,
})

export const workspaceEditStatusSchema = z.enum([
  "pending",
  "denied",
  "applied",
  "failed",
])

export const workspaceEditSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  threadId: z.string(),
  runId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  operation: z.string(),
  path: z.string(),
  status: workspaceEditStatusSchema,
  approvalMode: threadModeSchema,
  input: z.record(z.unknown()),
  result: z.record(z.unknown()).optional(),
  contentHashBefore: z.string().optional(),
  contentHashAfter: z.string().optional(),
  createdAt: z.string(),
  appliedAt: z.string().optional(),
})

export const decideToolApprovalResponseSchema = z.object({
  edit: workspaceEditSchema,
  output: z.record(z.unknown()),
})

export const abortRunResponseSchema = z.object({
  run: runSchema,
})

export const DEFAULT_GATEWAY_MODEL = "openai/gpt-4o-mini"
/** @deprecated Use DEFAULT_GATEWAY_MODEL. */
export const DEFAULT_OPENAI_MODEL = DEFAULT_GATEWAY_MODEL

export type RunStatus = z.infer<typeof runStatusSchema>
export type ThreadStatus = z.infer<typeof threadStatusSchema>
export type ThreadMode = z.infer<typeof threadModeSchema>
export type WorkspaceBackendType = z.infer<typeof workspaceBackendTypeSchema>
export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>
export type MessageRole = z.infer<typeof messageRoleSchema>
export type MessageStatus = z.infer<typeof messageStatusSchema>
export type MessagePart = z.infer<typeof messagePartSchema>
export type RunStepType = z.infer<typeof runStepTypeSchema>
export type RunStepStatus = z.infer<typeof runStepStatusSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type Thread = z.infer<typeof threadSchema>
export type Message = z.infer<typeof messageSchema>
export type Run = z.infer<typeof runSchema>
export type RunUsage = z.infer<typeof runUsageSchema>
export type RunStep = z.infer<typeof runStepSchema>
export type WorkspaceEdit = z.infer<typeof workspaceEditSchema>
export type DecideToolApprovalResponse = z.infer<
  typeof decideToolApprovalResponseSchema
>
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
export type AgentSourceThread = z.infer<typeof agentSourceThreadSchema>
export type AgentSourceWorkflow = z.infer<typeof agentSourceWorkflowSchema>
export type Agent = z.infer<typeof agentSchema>
export type AgentListItem = z.infer<typeof agentListItemSchema>
export type AgentToolGrantInput = z.infer<typeof agentToolGrantInputSchema>
export type AgentToolGrantInputList = z.infer<
  typeof agentToolGrantInputListSchema
>
export type ToolGrantValidationStatus = z.infer<
  typeof toolGrantValidationStatusSchema
>
export type UnsupportedSourceStepReason = z.infer<
  typeof unsupportedSourceStepReasonSchema
>
export type AgentPromotionDraftToolGrantProposal = z.infer<
  typeof agentPromotionDraftToolGrantProposalSchema
>
export type ProposedToolGrant = z.infer<typeof proposedToolGrantSchema>
export type UnsupportedSourceStep = z.infer<typeof unsupportedSourceStepSchema>

export function hasBlockingProposedToolGrants(
  grants: ProposedToolGrant[]
): boolean {
  return grants.some(
    (grant) => grant.required && grant.validationStatus !== "valid"
  )
}

export function proposedToolGrantsToInputs(
  grants: ProposedToolGrant[]
): AgentToolGrantInput[] {
  return grants
    .filter((grant) => grant.required && grant.validationStatus === "valid")
    .map((grant) => ({
      toolkitSlug: grant.toolkitSlug,
      connectionId: grant.connectionId,
    }))
}
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>
export type UpdateAgentRequest = z.infer<typeof updateAgentRequestSchema>
export type CreateAgentTestThreadRequest = z.infer<
  typeof createAgentTestThreadRequestSchema
>
export type AgentPromotionDraft = z.infer<typeof agentPromotionDraftSchema>
export type CreateAgentPromotionDraftResponse = z.infer<
  typeof createAgentPromotionDraftResponseSchema
>
export type CreateAgentFromPromotionDraftRequest = z.infer<
  typeof createAgentFromPromotionDraftRequestSchema
>
export type UpdateAgentPromotionDraftRequest = z.infer<
  typeof updateAgentPromotionDraftRequestSchema
>
export type AgentRecentThreadSummary = z.infer<
  typeof agentRecentThreadSummarySchema
>
export type AgentLibrarySummary = z.infer<typeof agentLibrarySummarySchema>
export type AgentMemorySummary = z.infer<typeof agentMemorySummarySchema>
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
export type SavedMemoryCategoryKey = z.infer<
  typeof savedMemoryCategoryKeySchema
>
export type SavedMemoryCategoryName = z.infer<
  typeof savedMemoryCategoryNameSchema
>
export type SavedMemoryCategory = z.infer<typeof savedMemoryCategorySchema>
export type SavedMemorySource = z.infer<typeof savedMemorySourceSchema>
export type SavedMemory = z.infer<typeof savedMemorySchema>
export type CreateSavedMemoryRequest = z.infer<
  typeof createSavedMemoryRequestSchema
>
export type UpdateSavedMemoryRequest = z.infer<
  typeof updateSavedMemoryRequestSchema
>
export type MemoriesListResponse = z.infer<typeof memoriesListResponseSchema>
export type ProjectContextSummary = z.infer<typeof projectContextSummarySchema>
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>
export type CreateProjectMemoryRequest = z.infer<
  typeof createProjectMemoryRequestSchema
>
export type UpdateProjectMemoryRequest = z.infer<
  typeof updateProjectMemoryRequestSchema
>
export type DocumentType = z.infer<typeof documentTypeSchema>
export type DocumentVisibilityScope = z.infer<
  typeof documentVisibilityScopeSchema
>
export type DocumentSource = z.infer<typeof documentSourceSchema>
export type Document = z.infer<typeof documentSchema>
export type DocumentVersion = z.infer<typeof documentVersionSchema>
export type DocumentPublic = z.infer<typeof documentPublicSchema>
export type DocumentVersionSummary = z.infer<
  typeof documentVersionSummarySchema
>
export type DocumentDetailResponse = z.infer<
  typeof documentDetailResponseSchema
>
export type UpdateDocumentContentRequest = z.infer<
  typeof updateDocumentContentRequestSchema
>
export type UpdateDocumentContentResponse = z.infer<
  typeof updateDocumentContentResponseSchema
>
export type UpdateDocumentVisibilityRequest = z.infer<
  typeof updateDocumentVisibilityRequestSchema
>
export type UpdateDocumentVisibilityResponse = z.infer<
  typeof updateDocumentVisibilityResponseSchema
>
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>
export type ThreadDetail = z.infer<typeof threadDetailSchema>
export type ThreadListItem = z.infer<typeof threadListItemSchema>
export type AbortRunResponse = z.infer<typeof abortRunResponseSchema>
