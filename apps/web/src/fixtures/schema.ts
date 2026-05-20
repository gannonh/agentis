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

export const workspaceUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
})

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  model: z.string(),
  lastRunAt: z.string().optional(),
  lastUpdatedAt: z.string().optional(),
  runCount: z.number().default(0),
  qualityScore: z.number().nullable().optional(),
  costPerRun: z.number().nullable().optional(),
  totalCost: z.number().default(0),
  tools: z.array(z.string()).default([]),
  invocations: z.array(z.string()).default([]),
  skillsCount: z.number().default(0),
  memoriesCount: z.number().default(0),
  libraryCount: z.number().default(0),
  integrationsCount: z.number().default(0),
})

export const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: threadStatusSchema,
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  projectId: z.string().optional(),
  messageCount: z.number().optional(),
  cost: z.number().optional(),
  finishedAt: z.string().optional(),
  updatedAt: z.string(),
})

export const runSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  agentId: z.string(),
  title: z.string(),
  status: runStatusSchema,
  cost: z.number(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
})

export const commandCenterMetricsSchema = z.object({
  agents: z.number(),
  active: z.number(),
  totalRuns: z.number(),
  avgScore: z.number().nullable(),
  totalCost: z.number(),
  pending: z.number(),
})

export const needsAttentionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  tag: z.string(),
  agentId: z.string().optional(),
})

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  pinned: z.boolean().default(false),
})

export const memorySchema = z.object({
  id: z.string(),
  content: z.string(),
  scope: z.enum(["global", "project", "agent"]),
  importance: z.enum(["low", "medium", "high"]).optional(),
})

export const rubricSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentId: z.string().optional(),
})

export const learningConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  messageCount: z.number(),
  updatedAt: z.string(),
})

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["connected", "oauth_required", "not_configured", "not_connected"]),
  category: z.string().optional(),
})

export const integrationCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
})

export const artifactSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum([
    "document",
    "webpage",
    "image",
    "video",
    "table",
    "slides",
    "other",
  ]),
  projectName: z.string().optional(),
  threadTitle: z.string().optional(),
  agentName: z.string().optional(),
  createdAt: z.string(),
})

export const capabilityExampleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string().optional(),
  cost: z.string().optional(),
})

export const workspaceSchema = z.object({
  user: workspaceUserSchema,
  agents: z.array(agentSchema),
  threads: z.array(threadSchema),
  runs: z.array(runSchema),
  commandCenter: commandCenterMetricsSchema,
  needsAttention: z.array(needsAttentionItemSchema),
  skills: z.array(skillSchema),
  memories: z.array(memorySchema),
  rubrics: z.array(rubricSchema),
  learningConversations: z.array(learningConversationSchema),
  integrations: z.array(integrationSchema),
  integrationCategories: z.array(integrationCategorySchema),
  connectedIntegrations: z.number(),
  artifacts: z.array(artifactSchema),
  capabilityExamples: z.array(capabilityExampleSchema),
})

export type Workspace = z.infer<typeof workspaceSchema>
export type Agent = z.infer<typeof agentSchema>
export type Thread = z.infer<typeof threadSchema>
export type Run = z.infer<typeof runSchema>
export type Skill = z.infer<typeof skillSchema>
export type Artifact = z.infer<typeof artifactSchema>
export type Integration = z.infer<typeof integrationSchema>
