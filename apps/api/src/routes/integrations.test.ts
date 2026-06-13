import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { IntegrationService } from "../composio/integration-service.js"
import { MockComposioClient } from "../composio/mock-composio-client.js"
import type { ComposioClientAdapter } from "../composio/types.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

function extendComposioAdapter(
  overrides: Partial<ComposioClientAdapter> = {}
): ComposioClientAdapter {
  const base = new MockComposioClient()
  return {
    authorizeToolkit:
      overrides.authorizeToolkit ?? base.authorizeToolkit.bind(base),
    refreshConnectedAccount:
      overrides.refreshConnectedAccount ?? base.refreshConnectedAccount.bind(base),
    listConnectedAccounts:
      overrides.listConnectedAccounts ?? base.listConnectedAccounts.bind(base),
    executeTool: overrides.executeTool ?? base.executeTool.bind(base),
    listToolkits: overrides.listToolkits ?? base.listToolkits.bind(base),
    getToolkit: overrides.getToolkit ?? base.getToolkit.bind(base),
    listToolkitCategories:
      overrides.listToolkitCategories ?? base.listToolkitCategories.bind(base),
  }
}

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
      toolkits: { slug: string; integrationType: string }[]
      categories: string[]
      composioMockEnabled: boolean
    }
    expect(body.toolkits.map((t) => t.slug)).toContain("github")
    expect(body.toolkits[0]?.integrationType).toBe("native")
    expect(body.categories.length).toBeGreaterThan(0)
    expect(body.composioMockEnabled).toBe(true)
  })

  it("filters integrations by search query", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const response = await app.request("/api/integrations?q=github")
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      toolkits: { slug: string }[]
    }
    expect(body.toolkits.some((toolkit) => toolkit.slug === "github")).toBe(true)
    expect(body.toolkits.some((toolkit) => toolkit.slug === "slack")).toBe(false)
  })

  it("uses the API port when no Composio redirect base is configured", async () => {
    ctx = createTestContext()
    ctx.config.port = 3101
    ctx.config.composioRedirectBaseUrl = undefined
    ctx.repos.integrationToolkits.seedFeatured()
    let callbackUrl = ""
    const composio = extendComposioAdapter({
      async authorizeToolkit(_userId, _toolkitSlug, requestedCallbackUrl) {
        callbackUrl = requestedCallbackUrl
        return {
          connectionRequestId: "req-github",
          redirectUrl: "http://composio.test/authorize",
          connectedAccountId: "acct-github",
        }
      },
    })
    const service = new IntegrationService(ctx.repos, ctx.config, composio)

    await service.startConnection("github")

    expect(callbackUrl).toContain(
      "http://127.0.0.1:3101/api/integrations/callback"
    )
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
      toolkits: {
        slug: string
        status: string
        connectedAccountCount: number
      }[]
    }
    const github = listBody.toolkits.find((t) => t.slug === "github")
    expect(github?.status).toBe("connected")
    expect(github?.connectedAccountCount).toBeGreaterThan(0)
  })

  it("accepts callbacks when Composio returns the provider slug for the requested toolkit", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    ctx.repos.integrationConnections.create({
      toolkitSlug: "google-drive",
      status: "pending",
      composioConnectionRequestId: "req-google-drive",
      composioConnectedAccountId: "acct-google-drive",
    })
    const composio = extendComposioAdapter({
      async refreshConnectedAccount() {
        return {
          id: "acct-google-drive",
          toolkitSlug: "googledrive",
          status: "connected",
        }
      },
    })
    const services = {
      composio,
      integrations: new IntegrationService(ctx.repos, ctx.config, composio),
      toolExecution: createComposioServices(ctx.repos, ctx.config)
        .toolExecution,
    }
    const app = createApp(ctx.repos, ctx.config, services)

    const callback = await app.request(
      "/api/integrations/callback?connectionRequestId=req-google-drive&toolkitSlug=google-drive",
      { method: "GET" }
    )

    expect(callback.status).toBe(302)
    expect(callback.headers.get("location")).toContain("connected=google-drive")

    const list = await app.request("/api/integrations")
    const listBody = (await list.json()) as {
      toolkits: {
        slug: string
        status: string
        connectedAccountCount: number
      }[]
    }
    const googleDrive = listBody.toolkits.find((t) => t.slug === "google-drive")
    expect(googleDrive?.status).toBe("connected")
    expect(googleDrive?.connectedAccountCount).toBe(1)
  })

  it("rejects callbacks when Composio returns an account for a different toolkit", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    ctx.repos.integrationConnections.create({
      toolkitSlug: "google-drive",
      status: "pending",
      composioConnectionRequestId: "req-google-drive",
      composioConnectedAccountId: "acct-github",
    })
    const composio = extendComposioAdapter({
      async refreshConnectedAccount() {
        return {
          id: "acct-github",
          toolkitSlug: "github",
          status: "connected",
        }
      },
    })
    const services = {
      composio,
      integrations: new IntegrationService(ctx.repos, ctx.config, composio),
      toolExecution: createComposioServices(ctx.repos, ctx.config)
        .toolExecution,
    }
    const app = createApp(ctx.repos, ctx.config, services)

    const callback = await app.request(
      "/api/integrations/callback?connectionRequestId=req-google-drive&toolkitSlug=google-drive",
      { method: "GET" }
    )

    expect(callback.status).toBe(302)
    expect(callback.headers.get("location")).toContain(
      "error=toolkit_connection_mismatch"
    )

    const list = await app.request("/api/integrations")
    const listBody = (await list.json()) as {
      toolkits: {
        slug: string
        status: string
        connectedAccountCount: number
      }[]
    }
    const googleDrive = listBody.toolkits.find((t) => t.slug === "google-drive")
    expect(googleDrive?.status).toBe("error")
    expect(googleDrive?.connectedAccountCount).toBe(0)
  })

  it("syncs remote Composio accounts on refresh without retargeting granted accounts", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "error",
      composioConnectedAccountId: "acct-github-init",
      errorCode: "connection_error",
    })
    const composio = extendComposioAdapter({
      async refreshConnectedAccount(connectedAccountId) {
        return {
          id: connectedAccountId,
          toolkitSlug: "github",
          status: "connected",
        }
      },
      async listConnectedAccounts() {
        return [
          {
            id: "acct-github-live",
            toolkitSlug: "github",
            status: "connected",
            accountLabel: "octocat",
          },
          {
            id: "acct-github-init",
            toolkitSlug: "github",
            status: "pending",
          },
        ]
      },
    })
    const services = {
      composio,
      integrations: new IntegrationService(ctx.repos, ctx.config, composio),
      toolExecution: createComposioServices(ctx.repos, ctx.config)
        .toolExecution,
    }
    const app = createApp(ctx.repos, ctx.config, services)

    const refresh = await app.request("/api/integrations/refresh", {
      method: "POST",
    })
    expect(refresh.status).toBe(200)
    const body = (await refresh.json()) as {
      toolkits: { slug: string; status: string; connectedAccountCount: number }[]
    }
    const github = body.toolkits.find((toolkit) => toolkit.slug === "github")
    const connection = ctx.repos.integrationConnections.getByToolkitSlug("github")
    expect(connection?.composioConnectedAccountId).toBe("acct-github-init")
    expect(github?.status).toBe("connected")
    expect(github?.connectedAccountCount).toBe(1)
  })

  it("marks granted connections expired instead of retargeting to a different account", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github-old",
      accountLabel: "old-account",
    })
    const thread = ctx.repos.threads.create({
      title: "Granted refresh",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    ctx.repos.toolAccessGrants.create({
      scopeType: "thread",
      scopeId: thread.id,
      toolkitSlug: "github",
      connectionId: connection.id,
    })
    const composio = extendComposioAdapter({
      async refreshConnectedAccount(connectedAccountId) {
        return {
          id: connectedAccountId,
          toolkitSlug: "github",
          status: "connected",
        }
      },
      async listConnectedAccounts() {
        return [
          {
            id: "acct-github-new",
            toolkitSlug: "github",
            status: "connected",
            accountLabel: "new-account",
          },
        ]
      },
    })
    const services = {
      composio,
      integrations: new IntegrationService(ctx.repos, ctx.config, composio),
      toolExecution: createComposioServices(ctx.repos, ctx.config)
        .toolExecution,
    }
    const app = createApp(ctx.repos, ctx.config, services)

    const refresh = await app.request("/api/integrations/refresh", {
      method: "POST",
    })
    expect(refresh.status).toBe(200)

    const updated = ctx.repos.integrationConnections.getByToolkitSlug("github")
    expect(updated?.composioConnectedAccountId).toBe("acct-github-old")
    expect(updated?.status).toBe("expired")
    expect(updated?.errorCode).toBe("connection_expired")
  })

  it("adopts a preferred remote account when no local connection exists", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const composio = extendComposioAdapter({
      async refreshConnectedAccount(connectedAccountId) {
        return {
          id: connectedAccountId,
          toolkitSlug: "github",
          status: "connected",
        }
      },
      async listConnectedAccounts() {
        return [
          {
            id: "acct-github-live",
            toolkitSlug: "github",
            status: "connected",
            accountLabel: "octocat",
          },
        ]
      },
    })
    const services = {
      composio,
      integrations: new IntegrationService(ctx.repos, ctx.config, composio),
      toolExecution: createComposioServices(ctx.repos, ctx.config)
        .toolExecution,
    }
    const app = createApp(ctx.repos, ctx.config, services)

    const refresh = await app.request("/api/integrations/refresh", {
      method: "POST",
    })
    expect(refresh.status).toBe(200)
    const body = (await refresh.json()) as {
      toolkits: { slug: string; status: string; connectedAccountCount: number }[]
    }
    const github = body.toolkits.find((toolkit) => toolkit.slug === "github")
    expect(github?.status).toBe("connected")
    expect(github?.connectedAccountCount).toBe(1)
  })

  it("resets a local connection when the toolkit is no longer in the catalog", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.upsertFromCatalog({
      slug: "retired-toolkit",
      name: "Retired Toolkit",
      description: "Removed from Composio",
      category: "developer",
      featured: false,
      integrationType: "native",
    })
    ctx.repos.integrationConnections.create({
      toolkitSlug: "retired-toolkit",
      status: "error",
      errorCode: "connection_error",
    })
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const reset = await app.request("/api/integrations/retired-toolkit/connection", {
      method: "DELETE",
    })
    expect(reset.status).toBe(200)
    expect(
      ctx.repos.integrationConnections.getByToolkitSlug("retired-toolkit")
    ).toBeNull()
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
      body: JSON.stringify({
        toolkitSlug: "github",
        connectionId: connection.id,
      }),
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

  it("rejects grants when connection toolkit does not match request", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "mock-acct-github",
    })
    const thread = ctx.repos.threads.create({
      title: "Mismatch grant",
      model: "gpt-4o-mini",
      mode: "agent",
    })

    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const grant = await app.request(`/api/threads/${thread.id}/tool-grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolkitSlug: "slack",
        connectionId: github.id,
      }),
    })
    expect(grant.status).toBe(400)
    const body = (await grant.json()) as { error: string }
    expect(body.error).toBe("toolkit_connection_mismatch")
  })
})
