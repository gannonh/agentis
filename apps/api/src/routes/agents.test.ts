import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("agent routes", () => {
  it("rejects invalid create payloads", async () => {
    ctx = createTestContext()
    const app = createApp(
      ctx.repos,
      ctx.config,
      createComposioServices(ctx.repos, ctx.config)
    )

    const response = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        systemPrompt: "Answer with citations.",
      }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_agent")
  })

  it("rejects duplicate create grants without persisting a partial agent", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const app = createApp(
      ctx.repos,
      ctx.config,
      createComposioServices(ctx.repos, ctx.config)
    )

    const response = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        toolGrants: [
          { toolkitSlug: "github", connectionId: connection.id },
          { toolkitSlug: "github", connectionId: connection.id },
        ],
      }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe("duplicate_toolkit_grant")
    expect(ctx.repos.agents.list()).toHaveLength(0)
  })

  it("creates and lists agents with initial versions and persisted tool grants", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const app = createApp(
      ctx.repos,
      ctx.config,
      createComposioServices(ctx.repos, ctx.config)
    )

    const created = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Research Agent",
        description: "Finds source-backed answers",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        toolGrants: [{ toolkitSlug: "github", connectionId: connection.id }],
      }),
    })

    expect(created.status).toBe(201)
    const createdBody = (await created.json()) as {
      agent: {
        id: string
        name: string
        currentConfigurationVersion: { version: number; model: string }
        toolGrantCount: number
      }
      configurationVersions: { version: number }[]
      toolGrants: { scopeType: string; toolkitSlug: string }[]
    }
    expect(createdBody.agent.name).toBe("Research Agent")
    expect(createdBody.agent.currentConfigurationVersion.version).toBe(1)
    expect(createdBody.agent.toolGrantCount).toBe(1)
    expect(createdBody.configurationVersions).toHaveLength(1)
    expect(createdBody.toolGrants).toMatchObject([
      { scopeType: "agent", toolkitSlug: "github" },
    ])

    const list = await app.request("/api/agents")
    expect(list.status).toBe(200)
    const listBody = (await list.json()) as {
      id: string
      currentConfigurationVersion: { version: number }
      toolGrantCount: number
    }[]
    expect(listBody.map((agent) => agent.id)).toEqual([createdBody.agent.id])
    expect(listBody[0]?.currentConfigurationVersion.version).toBe(1)
    expect(listBody[0]?.toolGrantCount).toBe(1)
  })
})
