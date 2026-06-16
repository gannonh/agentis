import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { signWebhookPayload } from "../lib/webhook-secret.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import { WebhookProducer } from "./webhook-producer.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("WebhookProducer", () => {
  it("claims queued deliveries, creates runs, and completes them in the background", async () => {
    ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Webhook Worker Agent",
      systemPrompt: "Run on webhook.",
      model: "gpt-4o-mini",
    })
    const created = ctx.repos.agentWebhooks.create({
      agentId: agent.id,
      name: "Inbound",
      promptTemplate: "Say hello from webhook: {{payload}}",
    })
    const body = JSON.stringify({ message: "hello" })
    const timestamp = String(Math.floor(Date.now() / 1000))
    const delivery = ctx.repos.agentWebhookDeliveries.queueAuthenticatedDelivery({
      webhookId: created.webhook.id,
      agentId: agent.id,
      deliveryKey: "evt_worker",
      requestTimestamp: timestamp,
      payload: { message: "hello" },
      payloadJson: body,
    })

    const producer = new WebhookProducer(ctx.repos, config, services)
    const result = await producer.processQueuedDeliveries("2026-06-15T12:00:00.000Z")

    expect(result.processed).toBe(1)
    expect(result.completed).toBe(1)
    const invocations = ctx.repos.agentInvocationRuns.listBySource(
      "webhook",
      delivery.id
    )
    expect(invocations).toHaveLength(1)
    expect(invocations[0]?.status).toBe("completed")
    expect(invocations[0]?.runId).toBeTruthy()
    expect(ctx.repos.runs.getById(invocations[0]!.runId!)?.status).toBe(
      "completed"
    )
    const updatedDelivery = ctx.repos.agentWebhookDeliveries.getById(delivery.id)
    expect(updatedDelivery?.status).toBe("completed")
    const updatedWebhook = ctx.repos.agentWebhooks.getById(created.webhook.id)
    expect(updatedWebhook?.lastDeliveryStatus).toBe("completed")
  }, 20_000)

  it("skips duplicate claims for the same delivery slot", async () => {
    ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Duplicate Webhook Agent",
      systemPrompt: "Run on webhook.",
      model: "gpt-4o-mini",
    })
    const created = ctx.repos.agentWebhooks.create({
      agentId: agent.id,
      name: "Duplicate",
      promptTemplate: "Hello {{deliveryId}}",
    })
    const delivery = ctx.repos.agentWebhookDeliveries.queueAuthenticatedDelivery({
      webhookId: created.webhook.id,
      agentId: agent.id,
      deliveryKey: "evt_dup_worker",
      requestTimestamp: "2026-06-15T12:00:00.000Z",
      payload: { message: "hello" },
      payloadJson: JSON.stringify({ message: "hello" }),
    })
    ctx.repos.agentWebhookDeliveries.markStatus(delivery.id, {
      status: "queued",
    })

    const producer = new WebhookProducer(ctx.repos, config, services)
    const first = await producer.processQueuedDeliveries("2026-06-15T12:00:00.000Z")
    ctx.repos.agentWebhookDeliveries.markStatus(delivery.id, {
      status: "queued",
    })
    const second = await producer.processQueuedDeliveries("2026-06-15T12:00:00.000Z")

    expect(first.completed).toBe(1)
    expect(second.skipped).toBe(1)
    expect(
      ctx.repos.agentInvocationRuns.listBySource("webhook", delivery.id)
    ).toHaveLength(1)
  }, 25_000)

  it("records project validation failures without disabling the webhook", async () => {
    ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Project Agent",
      systemPrompt: "Run on webhook.",
      model: "gpt-4o-mini",
    })
    const project = ctx.repos.projects.create({
      name: "Archived",
      goals: "Archive me",
    })
    ctx.repos.projects.archive(project.id)
    const created = ctx.repos.agentWebhooks.create({
      agentId: agent.id,
      name: "Project bound",
      promptTemplate: "Hello",
      projectId: project.id,
    })
    const delivery = ctx.repos.agentWebhookDeliveries.queueAuthenticatedDelivery({
      webhookId: created.webhook.id,
      agentId: agent.id,
      deliveryKey: "evt_invalid_project",
      requestTimestamp: "2026-06-15T12:00:00.000Z",
      payload: {},
      payloadJson: "{}",
    })

    const producer = new WebhookProducer(ctx.repos, config, services)
    const result = await producer.processQueuedDeliveries("2026-06-15T12:00:00.000Z")

    expect(result.failed).toBe(1)
    expect(ctx.repos.agentWebhooks.getById(created.webhook.id)?.status).toBe(
      "enabled"
    )
    expect(ctx.repos.agentWebhookDeliveries.getById(delivery.id)?.status).toBe(
      "failed"
    )
  })

  it("exposes webhook invocation source on agent detail", async () => {
    ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const app = createApp(ctx.repos, config, services)
    const agent = ctx.repos.agents.create({
      name: "Detail Agent",
      systemPrompt: "Detail webhook.",
      model: "gpt-4o-mini",
    })
    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Detail Webhook",
          promptTemplate: "Payload: {{payload}}",
        }),
      })
    ).json() as { id: string; secret: string }

    const body = JSON.stringify({ event: "detail" })
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = signWebhookPayload(created.secret, timestamp, body)
    await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": timestamp,
        "x-agentis-webhook-signature": signature,
      },
      body,
    })

    const producer = new WebhookProducer(ctx.repos, config, services)
    await producer.processQueuedDeliveries("2026-06-15T12:00:00.000Z")

    const detail = await app.request(`/api/agents/${agent.id}`)
    expect(detail.status).toBe(200)
    const detailBody = (await detail.json()) as {
      information: {
        recentThreads: Array<{
          invocationSource?: {
            type: string
            webhookName?: string
          }
        }>
      }
    }
    const webhookThread = detailBody.information.recentThreads.find(
      (thread) => thread.invocationSource?.type === "webhook"
    )
    expect(webhookThread?.invocationSource?.webhookName).toBe("Detail Webhook")
  }, 25_000)
})
