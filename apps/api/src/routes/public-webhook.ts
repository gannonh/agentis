import { Hono } from "hono"
import {
  webhookDeliveryAcceptedResponseSchema,
  type AgentWebhookDelivery,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { createId, nowIso } from "../lib/ids.js"
import {
  isWebhookTimestampFresh,
  parseWebhookTimestamp,
  verifyWebhookSignature,
} from "../lib/webhook-secret.js"
import type { Repositories } from "../repositories/index.js"
import { tryQueueAuthenticatedDelivery } from "../repositories/agent-webhook-delivery-repository.js"

const TIMESTAMP_HEADER = "x-agentis-webhook-timestamp"
const SIGNATURE_HEADER = "x-agentis-webhook-signature"
const DELIVERY_ID_HEADER = "x-agentis-delivery-id"

function acceptedDeliveryResponse(
  delivery: Pick<AgentWebhookDelivery, "id" | "status">,
  status: 200 | 202
) {
  return new Response(
    JSON.stringify(
      webhookDeliveryAcceptedResponseSchema.parse({
        deliveryId: delivery.id,
        status: delivery.status,
      })
    ),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  )
}

export function createPublicWebhookRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()

  app.post("/agents/:webhookId", async (c) => {
    const webhookId = c.req.param("webhookId")
    const webhook = repos.agentWebhooks.getById(webhookId)
    if (!webhook) {
      return c.json(
        { error: "Webhook not found", code: "agent_webhook_not_found" },
        404
      )
    }

    const timestampHeader = c.req.header(TIMESTAMP_HEADER)
    const signatureHeader = c.req.header(SIGNATURE_HEADER)
    if (!timestampHeader || !signatureHeader) {
      return c.json(
        {
          error: "Missing webhook signature headers.",
          code: "webhook_signature_required",
        },
        401
      )
    }

    const rawBody = await c.req.text()
    const parsedTimestamp = parseWebhookTimestamp(timestampHeader)
    if (!parsedTimestamp.ok) {
      return c.json(
        { error: parsedTimestamp.reason, code: "invalid_webhook_timestamp" },
        400
      )
    }
    if (
      !isWebhookTimestampFresh(
        parsedTimestamp.epochSeconds,
        config.webhookReplayWindowSeconds
      )
    ) {
      return c.json(
        { error: "Webhook timestamp is outside the replay window." },
        400
      )
    }

    const secret = repos.agentWebhooks.getSecretById(webhookId)
    if (
      !secret ||
      !verifyWebhookSignature({
        secret,
        timestamp: timestampHeader.trim(),
        rawBody,
        signatureHeader,
      })
    ) {
      return c.json(
        { error: "Invalid webhook signature.", code: "invalid_webhook_signature" },
        401
      )
    }

    if (webhook.status !== "enabled") {
      return c.json(
        { error: "Webhook is disabled.", code: "agent_webhook_disabled" },
        410
      )
    }

    if (Buffer.byteLength(rawBody, "utf8") > config.webhookMaxPayloadBytes) {
      return c.json(
        { error: "Webhook payload is too large.", code: "webhook_payload_too_large" },
        413
      )
    }

    let payload: unknown
    try {
      payload = rawBody.trim() === "" ? {} : JSON.parse(rawBody)
    } catch {
      return c.json(
        { error: "Malformed webhook JSON body.", code: "invalid_webhook_body" },
        400
      )
    }

    const deliveryKey =
      c.req.header(DELIVERY_ID_HEADER)?.trim() || createId("delivery_key")
    const now = nowIso()
    const queued = tryQueueAuthenticatedDelivery(repos.agentWebhookDeliveries, {
      webhookId: webhook.id,
      agentId: webhook.agentId,
      deliveryKey,
      requestTimestamp: timestampHeader.trim(),
      payload,
      payloadJson: rawBody,
    })

    if (!queued.ok) {
      return acceptedDeliveryResponse(
        queued.duplicate,
        queued.duplicate.status === "queued" ? 202 : 200
      )
    }

    repos.agentWebhooks.recordDeliveryResult({
      id: webhook.id,
      lastDeliveryStatus: "queued",
      deliveredAt: now,
      lastFailureReason: null,
    })

    return acceptedDeliveryResponse(queued.delivery, 202)
  })

  return app
}
