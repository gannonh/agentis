import type {
  AgentWebhook,
  AgentWebhookDelivery,
  AgentWebhookLastDeliveryStatus,
} from "@workspace/shared"
import type {
  agentWebhookDeliveries,
  agentWebhooks,
} from "../db/schema.js"
import { buildWebhookUrl } from "./webhook-secret.js"

type AgentWebhookRow = typeof agentWebhooks.$inferSelect
type AgentWebhookDeliveryRow = typeof agentWebhookDeliveries.$inferSelect

export function mapAgentWebhook(
  row: AgentWebhookRow,
  apiPublicOrigin: string,
  latestDelivery?: {
    threadId?: string | null
    runId?: string | null
  }
): AgentWebhook {
  return {
    id: row.id,
    agentId: row.agentId,
    name: row.name,
    status: row.status as AgentWebhook["status"],
    url: buildWebhookUrl(apiPublicOrigin, row.id),
    signingAlgorithm: "sha256",
    secretPrefix: row.secretPrefix,
    promptTemplate: row.promptTemplate,
    projectId: row.projectId ?? undefined,
    lastDeliveryAt: row.lastDeliveryAt ?? undefined,
    lastDeliveryStatus: row.lastDeliveryStatus
      ? (row.lastDeliveryStatus as AgentWebhookLastDeliveryStatus)
      : undefined,
    lastThreadId: latestDelivery?.threadId ?? undefined,
    lastRunId: latestDelivery?.runId ?? undefined,
    lastFailureReason: row.lastFailureReason ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapAgentWebhookDelivery(
  row: AgentWebhookDeliveryRow
): AgentWebhookDelivery {
  return {
    id: row.id,
    webhookId: row.webhookId,
    agentId: row.agentId,
    deliveryKey: row.deliveryKey,
    status: row.status as AgentWebhookDelivery["status"],
    requestTimestamp: row.requestTimestamp,
    payloadSummary: row.payloadSummary,
    threadId: row.threadId ?? undefined,
    runId: row.runId ?? undefined,
    failureReason: row.failureReason ?? undefined,
    claimedAt: row.claimedAt ?? undefined,
    startedAt: row.startedAt ?? undefined,
    finishedAt: row.finishedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function summarizeWebhookPayload(payload: unknown): string {
  if (payload === null) return "null"
  if (typeof payload === "string") {
    return payload.length > 120 ? `${payload.slice(0, 117)}...` : payload
  }
  if (typeof payload === "object") {
    const keys = Object.keys(payload as Record<string, unknown>)
    if (keys.length === 0) return "{}"
    const preview = keys.slice(0, 3).join(", ")
    return keys.length > 3 ? `{${preview}, ...}` : `{${preview}}`
  }
  return String(payload)
}
