import { z } from "zod"

const nonEmptyString = z.string().min(1)

export const agentWebhookStatusSchema = z.enum(["enabled", "disabled"])

export const agentWebhookDeliveryStatusSchema = z.enum([
  "queued",
  "claimed",
  "running",
  "completed",
  "failed",
  "skipped",
])

export const agentWebhookLastDeliveryStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "rejected",
])

export const agentWebhookSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: nonEmptyString,
  status: agentWebhookStatusSchema,
  url: nonEmptyString,
  signingAlgorithm: z.literal("sha256"),
  secretPrefix: nonEmptyString,
  promptTemplate: nonEmptyString,
  projectId: z.string().nullable().optional(),
  lastDeliveryAt: z.string().nullable().optional(),
  lastDeliveryStatus: agentWebhookLastDeliveryStatusSchema
    .nullable()
    .optional(),
  lastThreadId: z.string().nullable().optional(),
  lastRunId: z.string().nullable().optional(),
  lastFailureReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createAgentWebhookRequestSchema = z.object({
  name: nonEmptyString,
  status: agentWebhookStatusSchema.optional(),
  promptTemplate: nonEmptyString,
  projectId: z.string().nullable().optional(),
})

export const updateAgentWebhookRequestSchema = z
  .object({
    name: nonEmptyString.optional(),
    status: agentWebhookStatusSchema.optional(),
    promptTemplate: nonEmptyString.optional(),
    projectId: z.string().nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one webhook field is required.",
  })

export const createAgentWebhookResponseSchema = agentWebhookSchema.extend({
  secret: nonEmptyString,
})

export const rotateAgentWebhookSecretResponseSchema = z.object({
  webhook: agentWebhookSchema,
  secret: nonEmptyString,
})

export const agentWebhookDeliverySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  agentId: z.string(),
  deliveryKey: nonEmptyString,
  status: agentWebhookDeliveryStatusSchema,
  requestTimestamp: z.string(),
  payloadSummary: nonEmptyString,
  threadId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  claimedAt: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const webhookDeliveryAcceptedResponseSchema = z.object({
  deliveryId: z.string(),
  status: agentWebhookDeliveryStatusSchema,
})

export type AgentWebhookStatus = z.infer<typeof agentWebhookStatusSchema>
export type AgentWebhookDeliveryStatus = z.infer<
  typeof agentWebhookDeliveryStatusSchema
>
export type AgentWebhookLastDeliveryStatus = z.infer<
  typeof agentWebhookLastDeliveryStatusSchema
>
export type AgentWebhook = z.infer<typeof agentWebhookSchema>
export type CreateAgentWebhookRequest = z.infer<
  typeof createAgentWebhookRequestSchema
>
export type UpdateAgentWebhookRequest = z.infer<
  typeof updateAgentWebhookRequestSchema
>
export type CreateAgentWebhookResponse = z.infer<
  typeof createAgentWebhookResponseSchema
>
export type RotateAgentWebhookSecretResponse = z.infer<
  typeof rotateAgentWebhookSecretResponseSchema
>
export type AgentWebhookDelivery = z.infer<typeof agentWebhookDeliverySchema>
export type WebhookDeliveryAcceptedResponse = z.infer<
  typeof webhookDeliveryAcceptedResponseSchema
>
