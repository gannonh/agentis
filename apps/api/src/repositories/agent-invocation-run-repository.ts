import type { AgentInvocationRun } from "@workspace/shared"
import { and, eq, inArray, lte } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import {
  agentInvocationRuns,
  agentSchedules,
  agentWebhookDeliveries,
  agentWebhooks,
} from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { isUniqueConstraintError } from "../lib/sqlite-errors.js"
import { mapAgentInvocationRun } from "../lib/schedule-mappers.js"

type ClaimInput = {
  sourceType: "schedule" | "webhook"
  sourceId: string
  dueAt: string
}

export class AgentInvocationRunRepository {
  constructor(private readonly db: AppDatabase) {}

  tryClaim(input: ClaimInput): AgentInvocationRun | null {
    const now = nowIso()
    const row = {
      id: createId("invocation"),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      dueAt: input.dueAt,
      status: "claimed" as const,
      threadId: null,
      runId: null,
      failureReason: null,
      claimedAt: now,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    try {
      this.db.insert(agentInvocationRuns).values(row).run()
      return mapAgentInvocationRun(row)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return null
      }
      throw error
    }
  }

  getById(id: string): AgentInvocationRun | null {
    const row = this.db
      .select()
      .from(agentInvocationRuns)
      .where(eq(agentInvocationRuns.id, id))
      .get()
    return row ? mapAgentInvocationRun(row) : null
  }

  getByThreadId(threadId: string): AgentInvocationRun | null {
    const row = this.db
      .select()
      .from(agentInvocationRuns)
      .where(eq(agentInvocationRuns.threadId, threadId))
      .get()
    return row ? mapAgentInvocationRun(row) : null
  }

  listBySource(
    sourceType: "schedule" | "webhook",
    sourceId: string
  ): AgentInvocationRun[] {
    return this.db
      .select()
      .from(agentInvocationRuns)
      .where(
        and(
          eq(agentInvocationRuns.sourceType, sourceType),
          eq(agentInvocationRuns.sourceId, sourceId)
        )
      )
      .all()
      .map(mapAgentInvocationRun)
  }

  getWebhookSourceByThreadId(
    threadId: string
  ): { webhookId: string; webhookName: string; deliveryId: string } | null {
    const row = this.db
      .select({
        sourceId: agentInvocationRuns.sourceId,
      })
      .from(agentInvocationRuns)
      .where(
        and(
          eq(agentInvocationRuns.threadId, threadId),
          eq(agentInvocationRuns.sourceType, "webhook")
        )
      )
      .get()
    if (!row) return null

    const delivery = this.db
      .select({
        id: agentWebhookDeliveries.id,
        webhookId: agentWebhookDeliveries.webhookId,
      })
      .from(agentWebhookDeliveries)
      .where(eq(agentWebhookDeliveries.id, row.sourceId))
      .get()
    if (!delivery) return null

    const webhook = this.db
      .select({ id: agentWebhooks.id, name: agentWebhooks.name })
      .from(agentWebhooks)
      .where(eq(agentWebhooks.id, delivery.webhookId))
      .get()
    if (!webhook) return null

    return {
      webhookId: webhook.id,
      webhookName: webhook.name,
      deliveryId: delivery.id,
    }
  }

  getScheduleSourceByThreadId(
    threadId: string
  ): { scheduleId: string; scheduleName: string } | null {
    const row = this.db
      .select({
        sourceId: agentInvocationRuns.sourceId,
      })
      .from(agentInvocationRuns)
      .where(
        and(
          eq(agentInvocationRuns.threadId, threadId),
          eq(agentInvocationRuns.sourceType, "schedule")
        )
      )
      .get()
    if (!row) return null

    const schedule = this.db
      .select({ id: agentSchedules.id, name: agentSchedules.name })
      .from(agentSchedules)
      .where(eq(agentSchedules.id, row.sourceId))
      .get()
    if (!schedule) return null

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
    }
  }

  listStaleClaims(claimedBefore: string): AgentInvocationRun[] {
    return this.db
      .select()
      .from(agentInvocationRuns)
      .where(
        and(
          inArray(agentInvocationRuns.status, ["claimed", "running"]),
          lte(agentInvocationRuns.claimedAt, claimedBefore)
        )
      )
      .all()
      .map(mapAgentInvocationRun)
  }

  linkThreadAndRun(
    id: string,
    input: { threadId: string; runId: string }
  ): AgentInvocationRun | null {
    const updatedAt = nowIso()
    this.db
      .update(agentInvocationRuns)
      .set({
        threadId: input.threadId,
        runId: input.runId,
        status: "running",
        startedAt: updatedAt,
        updatedAt,
      })
      .where(eq(agentInvocationRuns.id, id))
      .run()
    return this.getById(id)
  }

  markStatus(
    id: string,
    input: {
      status: AgentInvocationRun["status"]
      failureReason?: string | null
      finishedAt?: string
    }
  ): AgentInvocationRun | null {
    const updatedAt = nowIso()
    const isTerminalStatus =
      input.status === "completed" ||
      input.status === "failed" ||
      input.status === "skipped"
    this.db
      .update(agentInvocationRuns)
      .set({
        status: input.status,
        failureReason: input.failureReason ?? null,
        ...(isTerminalStatus
          ? { finishedAt: input.finishedAt ?? updatedAt }
          : {}),
        updatedAt,
      })
      .where(eq(agentInvocationRuns.id, id))
      .run()
    return this.getById(id)
  }
}
