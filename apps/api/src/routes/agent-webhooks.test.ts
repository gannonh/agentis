import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { signWebhookPayload } from "../lib/webhook-secret.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

function createWebhookTestApp(context: TestContext) {
  return createApp(
    context.repos,
    context.config,
    createComposioServices(context.repos, context.config)
  )
}

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function signRequest(
  secret: string,
  body: string,
  timestamp = String(Math.floor(Date.now() / 1000)),
  deliveryId?: string
) {
  return {
    timestamp,
    signature: signWebhookPayload(secret, timestamp, body),
    deliveryId,
  }
}

describe("agent webhook routes", () => {
  it("creates webhooks and omits raw secrets from list responses", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Webhook Agent",
      systemPrompt: "Handle webhooks.",
      model: "gpt-4o-mini",
    })

    const createResponse = await app.request(
      `/api/agents/${agent.id}/webhooks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Inbound",
          promptTemplate: "Summarize: {{payload}}",
        }),
      }
    )
    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as {
      id: string
      secret: string
      secretPrefix: string
      url: string
    }
    expect(created.secret.startsWith("whsec_")).toBe(true)
    expect(created.url).toContain(created.id)

    const listResponse = await app.request(
      `/api/agents/${agent.id}/webhooks`
    )
    expect(listResponse.status).toBe(200)
    const listed = (await listResponse.json()) as Array<Record<string, unknown>>
    expect(listed).toHaveLength(1)
    expect(listed[0]?.secret).toBeUndefined()
    expect(listed[0]?.secretPrefix).toBe(created.secretPrefix)
  })

  it("rotates webhook secrets once per request", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Rotate Agent",
      systemPrompt: "Rotate.",
      model: "gpt-4o-mini",
    })
    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rotate",
          promptTemplate: "Hello",
        }),
      })
    ).json() as { id: string; secret: string }

    const rotateResponse = await app.request(
      `/api/agents/${agent.id}/webhooks/${created.id}/rotate-secret`,
      { method: "POST" }
    )
    expect(rotateResponse.status).toBe(200)
    const rotated = (await rotateResponse.json()) as {
      secret: string
      webhook: { secretPrefix: string }
    }
    expect(rotated.secret).not.toBe(created.secret)
    expect(rotated.webhook.secretPrefix).toBeTruthy()
  })

  it("accepts signed webhook deliveries and rejects invalid signatures", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Public Agent",
      systemPrompt: "Public webhook.",
      model: "gpt-4o-mini",
    })
    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Public",
          promptTemplate: "Payload: {{payload}}",
        }),
      })
    ).json() as { id: string; secret: string }

    const body = JSON.stringify({ event: "ping" })
    const signed = signRequest(created.secret, body)
    const accepted = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": signed.timestamp,
        "x-agentis-webhook-signature": signed.signature,
        "x-agentis-delivery-id": "evt_accepted",
      },
      body,
    })
    expect(accepted.status).toBe(202)
    const acceptedBody = (await accepted.json()) as {
      deliveryId: string
      status: string
    }
    expect(acceptedBody.status).toBe("queued")
    expect(
      ctx.repos.agentWebhookDeliveries.getById(acceptedBody.deliveryId)
    ).toBeTruthy()

    const invalid = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": signed.timestamp,
        "x-agentis-webhook-signature": "sha256=deadbeef",
      },
      body,
    })
    expect(invalid.status).toBe(401)
    expect(ctx.repos.agentWebhookDeliveries.listQueued()).toHaveLength(1)
  })

  it("rejects missing signature headers and stale timestamps", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Guard Agent",
      systemPrompt: "Guard.",
      model: "gpt-4o-mini",
    })
    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Guard",
          promptTemplate: "Payload: {{payload}}",
        }),
      })
    ).json() as { id: string; secret: string }

    const body = JSON.stringify({ event: "ping" })
    const missingHeaders = await app.request(
      `/api/webhooks/agents/${created.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }
    )
    expect(missingHeaders.status).toBe(401)

    const staleTimestamp = signRequest(
      created.secret,
      body,
      String(Math.floor(Date.now() / 1000) - 10_000)
    )
    const stale = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": staleTimestamp.timestamp,
        "x-agentis-webhook-signature": staleTimestamp.signature,
      },
      body,
    })
    expect(stale.status).toBe(400)
  })

  it("rejects disabled webhooks, malformed JSON, oversized payloads, and duplicate delivery ids", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Policy Agent",
      systemPrompt: "Policy.",
      model: "gpt-4o-mini",
    })
    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Policy",
          promptTemplate: "Payload: {{payload}}",
        }),
      })
    ).json() as { id: string; secret: string }

    const body = JSON.stringify({ event: "ping" })
    const signed = signRequest(created.secret, body, undefined, "evt_dup")
    const first = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": signed.timestamp,
        "x-agentis-webhook-signature": signed.signature,
        "x-agentis-delivery-id": "evt_dup",
      },
      body,
    })
    expect(first.status).toBe(202)

    const duplicateBody = JSON.stringify({ event: "ping-again" })
    const duplicateSigned = signRequest(
      created.secret,
      duplicateBody,
      undefined,
      "evt_dup"
    )
    const duplicate = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": duplicateSigned.timestamp,
        "x-agentis-webhook-signature": duplicateSigned.signature,
        "x-agentis-delivery-id": "evt_dup",
      },
      body: duplicateBody,
    })
    expect([200, 202]).toContain(duplicate.status)
    expect(ctx.repos.agentWebhookDeliveries.listQueued()).toHaveLength(1)

    const malformed = signRequest(created.secret, "{not-json")
    const malformedResponse = await app.request(
      `/api/webhooks/agents/${created.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agentis-webhook-timestamp": malformed.timestamp,
          "x-agentis-webhook-signature": malformed.signature,
        },
        body: "{not-json",
      }
    )
    expect(malformedResponse.status).toBe(400)

    const oversizedBody = JSON.stringify({ blob: "x".repeat(70_000) })
    const oversizedSigned = signRequest(created.secret, oversizedBody)
    const oversized = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": oversizedSigned.timestamp,
        "x-agentis-webhook-signature": oversizedSigned.signature,
      },
      body: oversizedBody,
    })
    expect(oversized.status).toBe(413)

    await app.request(`/api/agents/${agent.id}/webhooks/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "disabled" }),
    })
    const disabledSigned = signRequest(created.secret, body)
    const disabled = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": disabledSigned.timestamp,
        "x-agentis-webhook-signature": disabledSigned.signature,
      },
      body,
    })
    expect(disabled.status).toBe(410)
  })

  it("rejects empty projectId values on create and update", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Project Validation Agent",
      systemPrompt: "Validate project ids.",
      model: "gpt-4o-mini",
    })

    const createResponse = await app.request(
      `/api/agents/${agent.id}/webhooks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid project",
          promptTemplate: "Payload: {{payload}}",
          projectId: "",
        }),
      }
    )
    expect(createResponse.status).toBeGreaterThanOrEqual(400)
    expect(createResponse.status).toBeLessThan(500)

    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Valid webhook",
          promptTemplate: "Payload: {{payload}}",
        }),
      })
    ).json() as { id: string }

    const updateResponse = await app.request(
      `/api/agents/${agent.id}/webhooks/${created.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "" }),
      }
    )
    expect(updateResponse.status).toBeGreaterThanOrEqual(400)
    expect(updateResponse.status).toBeLessThan(500)
  })

  it("accepts empty webhook bodies and stores normalized JSON for the worker", async () => {
    ctx = createTestContext()
    const app = createWebhookTestApp(ctx)
    const agent = ctx.repos.agents.create({
      name: "Empty Body Agent",
      systemPrompt: "Handle empty webhook bodies.",
      model: "gpt-4o-mini",
    })
    const created = await (
      await app.request(`/api/agents/${agent.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Empty body",
          promptTemplate: "Payload: {{payload}}",
        }),
      })
    ).json() as { id: string; secret: string }

    const signed = signRequest(created.secret, "")
    const accepted = await app.request(`/api/webhooks/agents/${created.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-webhook-timestamp": signed.timestamp,
        "x-agentis-webhook-signature": signed.signature,
      },
      body: "",
    })
    expect(accepted.status).toBe(202)
    const acceptedBody = (await accepted.json()) as { deliveryId: string }
    expect(
      ctx.repos.agentWebhookDeliveries.getPayloadJson(acceptedBody.deliveryId)
    ).toBe("{}")
  })
})
