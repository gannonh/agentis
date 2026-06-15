import type {
  AgentWebhookDelivery,
  AgentWebhookDeliveryStatus,
} from "@workspace/shared"
import { and, asc, desc, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { agentWebhookDeliveries, agentWebhooks } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import {
  mapAgentWebhookDelivery,
  summarizeWebhookPayload,
} from "../lib/webhook-mappers.js"

type QueueInput = {
  webhookId: string
  agentId: string
  deliveryKey: string
  requestTimestamp: string
  payload: unknown
  payloadJson: string
}

export class AgentWebhookDeliveryRepository {
  constructor(private readonly db: AppDatabase) {}

  getById(id: string): AgentWebhookDelivery | null {
    const row = this.db
      .select()
      .from(agentWebhookDeliveries)
      .where(eq(agentWebhookDeliveries.id, id))
      .get()
    return row ? mapAgentWebhookDelivery(row) : null
  }

  getByDeliveryKey(
    webhookId: string,
    deliveryKey: string
  ): AgentWebhookDelivery | null {
    const row = this.db
      .select()
      .from(agentWebhookDeliveries)
      .where(
        and(
          eq(agentWebhookDeliveries.webhookId, webhookId),
          eq(agentWebhookDeliveries.deliveryKey, deliveryKey)
        )
      )
      .get()
    return row ? mapAgentWebhookDelivery(row) : null
  }

  queueAuthenticatedDelivery(input: QueueInput): AgentWebhookDelivery {
    const now = nowIso()
    const row = {
      id: createId("delivery"),
      webhookId: input.webhookId,
      agentId: input.agentId,
      deliveryKey: input.deliveryKey,
      status: "queued" as const,
      requestTimestamp: input.requestTimestamp,
      payloadJson: input.payloadJson,
      payloadSummary: summarizeWebhookPayload(input.payload),
      threadId: null,
      runId: null,
      failureReason: null,
      claimedAt: null,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(agentWebhookDeliveries).values(row).run()
    return mapAgentWebhookDelivery(row)
  }

  getLatestForWebhook(webhookId: string): AgentWebhookDelivery | null {
    const rows = this.db
      .select()
      .from(agentWebhookDeliveries)
      .where(eq(agentWebhookDeliveries.webhookId, webhookId))
      .orderBy(desc(agentWebhookDeliveries.createdAt))
      .limit(1)
      .all()
    const row = rows[0]
    return row ? mapAgentWebhookDelivery(row) : null
  }

  listQueued(limit = 50): AgentWebhookDelivery[] {
    return this.db
      .select({
        delivery: agentWebhookDeliveries,
      })
      .from(agentWebhookDeliveries)
      .innerJoin(
        agentWebhooks,
        eq(agentWebhookDeliveries.webhookId, agentWebhooks.id)
      )
      .where(
        and(
          eq(agentWebhookDeliveries.status, "queued"),
          eq(agentWebhooks.status, "enabled")
        )
      )
      .orderBy(asc(agentWebhookDeliveries.createdAt))
      .limit(limit)
      .all()
      .map((row) => mapAgentWebhookDelivery(row.delivery))
  }

  claimDelivery(id: string): AgentWebhookDelivery | null {
    const existing = this.getById(id)
    if (!existing || existing.status !== "queued") return null
    const claimedAt = nowIso()
    const updated = this.db
      .update(agentWebhookDeliveries)
      .set({
        status: "claimed",
        claimedAt,
        updatedAt: claimedAt,
      })
      .where(
        and(
          eq(agentWebhookDeliveries.id, id),
          eq(agentWebhookDeliveries.status, "queued")
        )
      )
      .run()
    if (updated.changes === 0) return null
    return this.getById(id)
  }

  getPayloadJson(id: string): string | null {
    const row = this.db
      .select({ payloadJson: agentWebhookDeliveries.payloadJson })
      .from(agentWebhookDeliveries)
      .where(eq(agentWebhookDeliveries.id, id))
      .get()
    return row?.payloadJson ?? null
  }

  linkThreadAndRun(
    id: string,
    input: { threadId: string; runId: string }
  ): AgentWebhookDelivery | null {
    const updatedAt = nowIso()
    this.db
      .update(agentWebhookDeliveries)
      .set({
        threadId: input.threadId,
        runId: input.runId,
        status: "running",
        startedAt: updatedAt,
        updatedAt,
      })
      .where(eq(agentWebhookDeliveries.id, id))
      .run()
    return this.getById(id)
  }

  markStatus(
    id: string,
    input: {
      status: AgentWebhookDeliveryStatus
      failureReason?: string | null
      finishedAt?: string
    }
  ): AgentWebhookDelivery | null {
    const updatedAt = nowIso()
    const isTerminal =
      input.status === "completed" ||
      input.status === "failed" ||
      input.status === "skipped"
    this.db
      .update(agentWebhookDeliveries)
      .set({
        status: input.status,
        failureReason: input.failureReason ?? null,
        ...(isTerminal
          ? { finishedAt: input.finishedAt ?? updatedAt }
          : {}),
        updatedAt,
      })
      .where(eq(agentWebhookDeliveries.id, id))
      .run()
    return this.getById(id)
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("SQLITE_CONSTRAINT_UNIQUE"))
  )
}

export function tryQueueAuthenticatedDelivery(
  repo: AgentWebhookDeliveryRepository,
  input: QueueInput
): { ok: true; delivery: AgentWebhookDelivery } | { ok: false; duplicate: AgentWebhookDelivery } {
  try {
    const delivery = repo.queueAuthenticatedDelivery(input)
    return { ok: true, delivery }
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const duplicate = repo.getByDeliveryKey(input.webhookId, input.deliveryKey)
    if (!duplicate) throw error
    return { ok: false, duplicate }
  }
}
