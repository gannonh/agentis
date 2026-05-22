import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("integration routes", () => {
  it("lists featured toolkits", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const response = await app.request("/api/integrations")
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      toolkits: { slug: string }[]
      composioMockEnabled: boolean
    }
    expect(body.toolkits.map((t) => t.slug)).toContain("github")
    expect(body.composioMockEnabled).toBe(true)
  })

  it("starts mock connection and completes callback", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const connect = await app.request("/api/integrations/github/connect", {
      method: "POST",
    })
    expect(connect.status).toBe(201)
    const connectBody = (await connect.json()) as {
      connection: { id: string; composioConnectionRequestId?: string }
      redirectUrl: string
    }
    expect(connectBody.redirectUrl).toContain("/api/integrations/callback")

    const callbackUrl = new URL(connectBody.redirectUrl)
    const callback = await app.request(
      `${callbackUrl.pathname}${callbackUrl.search}`,
      { method: "GET" }
    )
    expect(callback.status).toBe(302)
    expect(callback.headers.get("location")).toContain("connected=github")

    const list = await app.request("/api/integrations")
    const listBody = (await list.json()) as {
      toolkits: { slug: string; status: string; connectedAccountCount: number }[]
    }
    const github = listBody.toolkits.find((t) => t.slug === "github")
    expect(github?.status).toBe("connected")
    expect(github?.connectedAccountCount).toBeGreaterThan(0)
  })

  it("resets a pending connection so the toolkit shows not connected", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "pending",
      composioConnectionRequestId: "req-stale",
    })
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const reset = await app.request("/api/integrations/github/connection", {
      method: "DELETE",
    })
    expect(reset.status).toBe(200)

    const list = await app.request("/api/integrations")
    const listBody = (await list.json()) as {
      toolkits: { slug: string; status: string }[]
    }
    const github = listBody.toolkits.find((t) => t.slug === "github")
    expect(github?.status).toBe("not_connected")
  })

  it("grants and revokes thread toolkit access", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "mock-acct-github",
    })
    const thread = ctx.repos.threads.create({
      title: "Grant route",
      model: "gpt-4o-mini",
      mode: "agent",
    })

    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const grant = await app.request(`/api/threads/${thread.id}/tool-grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolkitSlug: "github", connectionId: connection.id }),
    })
    expect(grant.status).toBe(201)

    const list = await app.request(`/api/threads/${thread.id}/tool-grants`)
    const listBody = (await list.json()) as { grants: { id: string }[] }
    expect(listBody.grants).toHaveLength(1)

    const revoke = await app.request(
      `/api/threads/${thread.id}/tool-grants/${listBody.grants[0]!.id}`,
      { method: "DELETE" }
    )
    expect(revoke.status).toBe(200)
  })
})
