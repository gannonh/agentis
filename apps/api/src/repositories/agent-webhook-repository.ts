import {
  type AgentWebhook,
  type AgentWebhookDelivery,
  type AgentWebhookLastDeliveryStatus,
  type AgentWebhookStatus,
  type CreateAgentWebhookRequest,
  type UpdateAgentWebhookRequest,
} from "@workspace/shared"
import { and, asc, desc, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { agentWebhooks } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapAgentWebhook } from "../lib/webhook-mappers.js"
import {
  decryptWebhookSecret,
  encryptWebhookSecret,
  generateWebhookSecret,
  webhookSecretPrefix,
} from "../lib/webhook-secret.js"
import type { AgentWebhookDeliveryRepository } from "./agent-webhook-delivery-repository.js"

type WebhookCreateInput = CreateAgentWebhookRequest & {
  agentId: string
}

type WebhookUpdateInput = UpdateAgentWebhookRequest

export class AgentWebhookRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly apiPublicOrigin: string,
    private readonly deliveries?: Pick<
      AgentWebhookDeliveryRepository,
      "getLatestForWebhook"
    >
  ) {}

  private mapRow(row: typeof agentWebhooks.$inferSelect): AgentWebhook {
    const latest = this.deliveries?.getLatestForWebhook(row.id)
    return mapAgentWebhook(row, this.apiPublicOrigin, {
      threadId: latest?.threadId ?? undefined,
      runId: latest?.runId ?? undefined,
    })
  }

  create(input: WebhookCreateInput): {
    webhook: AgentWebhook
    secret: string
  } {
    const now = nowIso()
    const secret = generateWebhookSecret()
    const status = input.status ?? "enabled"
    const row = {
      id: createId("webhook"),
      agentId: input.agentId,
      name: input.name,
      status,
      secretCiphertext: encryptWebhookSecret(secret),
      secretPrefix: webhookSecretPrefix(secret),
      promptTemplate: input.promptTemplate,
      projectId: input.projectId ?? null,
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      lastFailureReason: null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(agentWebhooks).values(row).run()
    return {
      webhook: this.mapRow(row),
      secret,
    }
  }

  getById(id: string): AgentWebhook | null {
    const row = this.db
      .select()
      .from(agentWebhooks)
      .where(eq(agentWebhooks.id, id))
      .get()
    return row ? this.mapRow(row) : null
  }

  getSecretById(id: string): string | null {
    const row = this.db
      .select({ secretCiphertext: agentWebhooks.secretCiphertext })
      .from(agentWebhooks)
      .where(eq(agentWebhooks.id, id))
      .get()
    if (!row) return null
    return decryptWebhookSecret(row.secretCiphertext)
  }

  listByAgentId(agentId: string): AgentWebhook[] {
    return this.db
      .select()
      .from(agentWebhooks)
      .where(eq(agentWebhooks.agentId, agentId))
      .orderBy(desc(agentWebhooks.updatedAt))
      .all()
      .map((row) => this.mapRow(row))
  }

  hasEnabledWebhooks(agentId: string): boolean {
    const row = this.db
      .select({ id: agentWebhooks.id })
      .from(agentWebhooks)
      .where(
        and(
          eq(agentWebhooks.agentId, agentId),
          eq(agentWebhooks.status, "enabled")
        )
      )
      .get()
    return Boolean(row)
  }

  update(id: string, patch: WebhookUpdateInput): AgentWebhook | null {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(agentWebhooks)
      .set({
        name: patch.name ?? existing.name,
        status: patch.status ?? existing.status,
        promptTemplate: patch.promptTemplate ?? existing.promptTemplate,
        projectId:
          patch.projectId !== undefined
            ? patch.projectId
            : (existing.projectId ?? null),
        updatedAt,
      })
      .where(eq(agentWebhooks.id, id))
      .run()
    return this.getById(id)
  }

  rotateSecret(id: string): { webhook: AgentWebhook; secret: string } | null {
    const existing = this.getById(id)
    if (!existing) return null
    const secret = generateWebhookSecret()
    const updatedAt = nowIso()
    this.db
      .update(agentWebhooks)
      .set({
        secretCiphertext: encryptWebhookSecret(secret),
        secretPrefix: webhookSecretPrefix(secret),
        updatedAt,
      })
      .where(eq(agentWebhooks.id, id))
      .run()
    const webhook = this.getById(id)
    if (!webhook) return null
    return { webhook, secret }
  }

  disable(id: string, failureReason?: string | null): AgentWebhook | null {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(agentWebhooks)
      .set({
        status: "disabled" as AgentWebhookStatus,
        lastFailureReason: failureReason ?? existing.lastFailureReason ?? null,
        updatedAt,
      })
      .where(eq(agentWebhooks.id, id))
      .run()
    return this.getById(id)
  }

  recordDeliveryResult(input: {
    id: string
    lastDeliveryStatus: AgentWebhookLastDeliveryStatus
    lastFailureReason?: string | null
    deliveredAt: string
  }): AgentWebhook | null {
    const existing = this.getById(input.id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(agentWebhooks)
      .set({
        lastDeliveryAt: input.deliveredAt,
        lastDeliveryStatus: input.lastDeliveryStatus,
        lastFailureReason: input.lastFailureReason ?? null,
        updatedAt,
      })
      .where(eq(agentWebhooks.id, input.id))
      .run()
    return this.getById(input.id)
  }

  delete(id: string): boolean {
    const result = this.db
      .delete(agentWebhooks)
      .where(eq(agentWebhooks.id, id))
      .run()
    return result.changes > 0
  }
}
