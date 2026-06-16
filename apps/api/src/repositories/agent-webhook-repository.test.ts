import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { tryQueueAuthenticatedDelivery } from "./agent-webhook-delivery-repository.js"
import {
  decryptWebhookSecret,
  signWebhookPayload,
  verifyWebhookSignature,
} from "../lib/webhook-secret.js"

describe("AgentWebhookRepository", () => {
  it("creates webhooks with encrypted secrets and prefixes", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Webhook Agent",
      systemPrompt: "Handle webhooks.",
      model: "gpt-4o-mini",
    })

    const created = ctx.repos.agentWebhooks.create({
      agentId: agent.id,
      name: "Inbound alerts",
      promptTemplate: "Process: {{payload}}",
    })

    expect(created.secret.startsWith("whsec_")).toBe(true)
    expect(created.webhook.secretPrefix).toHaveLength(8)
    expect(created.webhook.url).toContain(created.webhook.id)
    expect(created.webhook.url).not.toContain(created.secret)

    const storedSecret = ctx.repos.agentWebhooks.getSecretById(created.webhook.id)
    expect(storedSecret).toBe(created.secret)
    expect(ctx.repos.agentWebhooks.listByAgentId(agent.id)).toHaveLength(1)
  })

  it("rotates secrets and updates prefix metadata", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Rotate Agent",
      systemPrompt: "Rotate secrets.",
      model: "gpt-4o-mini",
    })
    const created = ctx.repos.agentWebhooks.create({
      agentId: agent.id,
      name: "Rotate me",
      promptTemplate: "Hello {{deliveryId}}",
    })

    const rotated = ctx.repos.agentWebhooks.rotateSecret(created.webhook.id)
    expect(rotated?.secret).not.toBe(created.secret)
    expect(rotated?.webhook.secretPrefix).not.toBe(created.webhook.secretPrefix)
    expect(ctx.repos.agentWebhooks.getSecretById(created.webhook.id)).toBe(
      rotated?.secret
    )
  })

  it("queues deliveries and reuses duplicate delivery keys", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Delivery Agent",
      systemPrompt: "Queue deliveries.",
      model: "gpt-4o-mini",
    })
    const created = ctx.repos.agentWebhooks.create({
      agentId: agent.id,
      name: "Queue",
      promptTemplate: "Payload: {{payload}}",
    })

    const first = tryQueueAuthenticatedDelivery(ctx.repos.agentWebhookDeliveries, {
      webhookId: created.webhook.id,
      agentId: agent.id,
      deliveryKey: "evt_123",
      requestTimestamp: "2026-06-15T12:00:00.000Z",
      payload: { message: "hello" },
      payloadJson: JSON.stringify({ message: "hello" }),
    })
    expect(first.ok).toBe(true)

    const second = tryQueueAuthenticatedDelivery(ctx.repos.agentWebhookDeliveries, {
      webhookId: created.webhook.id,
      agentId: agent.id,
      deliveryKey: "evt_123",
      requestTimestamp: "2026-06-15T12:00:01.000Z",
      payload: { message: "hello again" },
      payloadJson: JSON.stringify({ message: "hello again" }),
    })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.duplicate.id).toBe(first.ok ? first.delivery.id : "")
    }
    expect(ctx.repos.agentWebhookDeliveries.listQueued()).toHaveLength(1)
  })

  it("verifies webhook signatures over raw bodies", () => {
    const secret = "whsec_test_secret_value"
    const timestamp = "1718452800"
    const body = '{"event":"ping"}'
    const signature = signWebhookPayload(secret, timestamp, body)
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        rawBody: body,
        signatureHeader: signature,
      })
    ).toBe(true)
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        rawBody: '{"event":"pong"}',
        signatureHeader: signature,
      })
    ).toBe(false)
    expect(decryptWebhookSecret).toBeDefined()
  })
})
