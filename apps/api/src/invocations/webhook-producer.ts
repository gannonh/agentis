import type { ComposioServices } from "../composio/index.js"
import type { AppConfig } from "../config.js"
import { nowIso } from "../lib/ids.js"
import { renderWebhookPrompt } from "../lib/webhook-prompt-template.js"
import type { Repositories } from "../repositories/index.js"
import {
  createRunExecutor,
  startAgentInvocationRun,
  validateRuntimeForExecution,
} from "./agent-run-starter.js"

export type WebhookProducerResult = {
  processed: number
  completed: number
  failed: number
  skipped: number
}

export class WebhookProducer {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly services: ComposioServices
  ) {}

  async processQueuedDeliveries(
    now = nowIso()
  ): Promise<WebhookProducerResult> {
    const result: WebhookProducerResult = {
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    }

    const queuedDeliveries = this.repos.agentWebhookDeliveries.listQueued()
    for (const delivery of queuedDeliveries) {
      result.processed += 1
      const claimedDelivery = this.repos.agentWebhookDeliveries.claimDelivery(
        delivery.id
      )
      if (!claimedDelivery) {
        result.skipped += 1
        continue
      }

      const webhook = this.repos.agentWebhooks.getById(delivery.webhookId)
      if (!webhook || webhook.status !== "enabled") {
        this.failInvocation({
          deliveryId: delivery.id,
          webhookId: delivery.webhookId,
          ranAt: now,
          failureReason: "Webhook is disabled.",
          lastDeliveryStatus: "failed",
        })
        result.skipped += 1
        continue
      }

      const claim = this.repos.agentInvocationRuns.tryClaim({
        sourceType: "webhook",
        sourceId: delivery.id,
        dueAt: delivery.createdAt,
      })
      if (!claim) {
        this.repos.agentWebhookDeliveries.markStatus(delivery.id, {
          status: "skipped",
          failureReason: "Duplicate webhook invocation claim.",
        })
        result.skipped += 1
        continue
      }

      const runtimeError = validateRuntimeForExecution(this.config)
      if (runtimeError) {
        this.failInvocation({
          deliveryId: delivery.id,
          webhookId: webhook.id,
          claimId: claim.id,
          ranAt: now,
          failureReason: runtimeError,
          lastDeliveryStatus: "failed",
        })
        result.failed += 1
        continue
      }

      const payloadJson =
        this.repos.agentWebhookDeliveries.getPayloadJson(delivery.id) ?? "{}"
      let prompt: string
      try {
        const payload = JSON.parse(payloadJson) as unknown
        prompt = renderWebhookPrompt(webhook.promptTemplate, {
          payload,
          deliveryId: delivery.id,
          receivedAt: delivery.requestTimestamp,
          maxPayloadChars: Math.min(this.config.webhookMaxPayloadBytes, 8_000),
        })
      } catch (error) {
        const failureReason =
          error instanceof Error
            ? error.message
            : "Failed to render webhook prompt."
        this.failInvocation({
          deliveryId: delivery.id,
          webhookId: webhook.id,
          claimId: claim.id,
          ranAt: now,
          failureReason,
          lastDeliveryStatus: "failed",
        })
        result.failed += 1
        continue
      }

      const started = startAgentInvocationRun(this.repos, {
        agentId: webhook.agentId,
        prompt,
        projectId: webhook.projectId,
      })

      if (!started.ok) {
        if (started.code === "agent_not_found") {
          this.repos.agentWebhooks.disable(webhook.id, started.message)
        }
        this.failInvocation({
          deliveryId: delivery.id,
          webhookId: webhook.id,
          claimId: claim.id,
          ranAt: now,
          failureReason: started.message,
          lastDeliveryStatus: "failed",
        })
        result.failed += 1
        continue
      }

      this.repos.agentInvocationRuns.linkThreadAndRun(claim.id, {
        threadId: started.threadId,
        runId: started.runId,
      })
      this.repos.agentWebhookDeliveries.linkThreadAndRun(delivery.id, {
        threadId: started.threadId,
        runId: started.runId,
      })

      try {
        this.repos.steps.create({
          runId: started.runId,
          type: "reasoning",
          status: "completed",
          title: "Webhook invocation",
          payload: {
            webhookId: webhook.id,
            webhookName: webhook.name,
            deliveryId: delivery.id,
          },
        })
        const executor = createRunExecutor(
          this.repos,
          this.config,
          this.services
        )
        const completedRun = await executor.executeToCompletion(started.runId)
        const finishedAt = nowIso()
        if (completedRun.status === "completed") {
          this.repos.agentInvocationRuns.markStatus(claim.id, {
            status: "completed",
            finishedAt,
          })
          this.repos.agentWebhookDeliveries.markStatus(delivery.id, {
            status: "completed",
            finishedAt,
          })
          this.repos.agentWebhooks.recordDeliveryResult({
            id: webhook.id,
            lastDeliveryStatus: "completed",
            deliveredAt: finishedAt,
            lastFailureReason: null,
          })
          result.completed += 1
        } else {
          const failureReason =
            completedRun.errorSummary ??
            `Webhook run finished with status ${completedRun.status}.`
          this.failInvocation({
            deliveryId: delivery.id,
            webhookId: webhook.id,
            claimId: claim.id,
            ranAt: finishedAt,
            failureReason,
            lastDeliveryStatus: "failed",
          })
          result.failed += 1
        }
      } catch (error) {
        const failureReason =
          error instanceof Error ? error.message : "Webhook run failed."
        this.failInvocation({
          deliveryId: delivery.id,
          webhookId: webhook.id,
          claimId: claim.id,
          ranAt: nowIso(),
          failureReason,
          lastDeliveryStatus: "failed",
        })
        result.failed += 1
      }
    }

    return result
  }

  private failInvocation(input: {
    deliveryId: string
    webhookId: string
    claimId?: string
    ranAt: string
    failureReason: string
    lastDeliveryStatus: "failed" | "rejected"
  }) {
    if (input.claimId) {
      this.repos.agentInvocationRuns.markStatus(input.claimId, {
        status: "failed",
        failureReason: input.failureReason,
        finishedAt: input.ranAt,
      })
    }
    this.repos.agentWebhookDeliveries.markStatus(input.deliveryId, {
      status: "failed",
      failureReason: input.failureReason,
      finishedAt: input.ranAt,
    })
    this.repos.agentWebhooks.recordDeliveryResult({
      id: input.webhookId,
      lastDeliveryStatus: input.lastDeliveryStatus,
      deliveredAt: input.ranAt,
      lastFailureReason: input.failureReason,
    })
  }
}
