import { afterEach, describe, expect, it, vi } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

function createAgentTestApp(context: TestContext) {
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

describe("agent routes", () => {
  it("rejects malformed create JSON as an invalid payload", async () => {
    ctx = createTestContext()
    const app = createAgentTestApp(ctx)

    const response = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_agent")
  })

  it("rejects invalid create payloads", async () => {
    ctx = createTestContext()
    const app = createAgentTestApp(ctx)

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
    const app = createAgentTestApp(ctx)

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

  it("rejects invalid update payloads", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_agent_update")
  })

  it("returns remediation when update grants reference a disconnected toolkit", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolGrants: [{ toolkitSlug: "github" }] }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as {
      error: string
      remediation?: string
    }
    expect(body.error).toBe("toolkit_not_connected")
    expect(body.remediation).toBe(
      "Connect the toolkit from Integrations before granting it to an agent."
    )
  })

  it("updates identity without creating a configuration version", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      description: "Finds sources",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Research Assistant", description: null }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      agent: { name: string; description?: string }
      configurationVersions: { version: number }[]
    }
    expect(body.agent.name).toBe("Research Assistant")
    expect(body.agent.description).toBeUndefined()
    expect(body.configurationVersions).toHaveLength(1)
  })

  it("updates run-affecting configuration and grants through shared DTOs", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: "Answer with citations and source quality notes.",
        model: "gpt-4.1-mini",
        maxCostPerRunUsd: 2,
        toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      agent: {
        systemPrompt: string
        model: string
        maxCostPerRunUsd: number
        currentConfigurationVersion: {
          version: number
          maxCostPerRunUsd: number
        }
        toolGrantCount: number
      }
      configurationVersions: { version: number }[]
      toolGrants: { toolkitSlug: string }[]
    }
    expect(body.agent.systemPrompt).toBe(
      "Answer with citations and source quality notes."
    )
    expect(body.agent.model).toBe("gpt-4.1-mini")
    expect(body.agent.maxCostPerRunUsd).toBe(2)
    expect(body.agent.currentConfigurationVersion).toMatchObject({
      version: 2,
      maxCostPerRunUsd: 2,
    })
    expect(body.agent.toolGrantCount).toBe(1)
    expect(body.configurationVersions).toHaveLength(2)
    expect(body.toolGrants).toMatchObject([{ toolkitSlug: "github" }])

    const reloaded = await app.request(`/api/agents/${agent.id}`)
    expect(reloaded.status).toBe(200)
    const reloadedBody = (await reloaded.json()) as {
      agent: { model: string; maxCostPerRunUsd: number }
      toolGrants: { toolkitSlug: string }[]
    }
    expect(reloadedBody.agent.model).toBe("gpt-4.1-mini")
    expect(reloadedBody.agent.maxCostPerRunUsd).toBe(2)
    expect(reloadedBody.toolGrants).toMatchObject([{ toolkitSlug: "github" }])
  })

  it("persists the full edit vertical through /api agent writes", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const slack = ctx.repos.integrationConnections.create({
      toolkitSlug: "slack",
      status: "connected",
      composioConnectedAccountId: "acct-slack",
    })
    const app = createAgentTestApp(ctx)

    const created = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Research Agent",
        description: "Finds source-backed answers",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
      }),
    })
    expect(created.status).toBe(201)
    const createdBody = (await created.json()) as { agent: { id: string } }
    const agentPath = `/api/agents/${createdBody.agent.id}`

    const identityOnly = await app.request(agentPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Research Assistant",
        description: "Updated identity",
      }),
    })
    expect(identityOnly.status).toBe(200)
    expect(
      ctx.repos.agents.listConfigurationVersions(createdBody.agent.id)
    ).toHaveLength(1)

    const runAffecting = await app.request(agentPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: "Answer with citations and source quality notes.",
        model: "gpt-4.1-mini",
        maxCostPerRunUsd: 3,
      }),
    })
    expect(runAffecting.status).toBe(200)
    expect(
      ctx.repos.agents.listConfigurationVersions(createdBody.agent.id)
    ).toHaveLength(2)

    const toolGrantEdit = await app.request(agentPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
      }),
    })
    expect(toolGrantEdit.status).toBe(200)

    const reloaded = await app.request(agentPath)
    expect(reloaded.status).toBe(200)
    const reloadedBody = (await reloaded.json()) as {
      agent: {
        name: string
        description: string
        systemPrompt: string
        model: string
        maxCostPerRunUsd: number
        currentConfigurationVersion: { version: number }
        toolGrantCount: number
      }
      configurationVersions: { version: number }[]
      toolGrants: { toolkitSlug: string }[]
    }
    expect(reloadedBody.agent).toMatchObject({
      name: "Research Assistant",
      description: "Updated identity",
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
      maxCostPerRunUsd: 3,
      toolGrantCount: 1,
    })
    expect(reloadedBody.agent.currentConfigurationVersion.version).toBe(3)
    expect(
      reloadedBody.configurationVersions.map((version) => version.version)
    ).toEqual([1, 2, 3])
    expect(reloadedBody.toolGrants).toMatchObject([{ toolkitSlug: "slack" }])
  })

  it("creates and lists agents with initial versions and persisted tool grants", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const app = createAgentTestApp(ctx)

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
    expect(listBody[0]?.currentConfigurationVersion).not.toHaveProperty(
      "toolGrants"
    )
    expect(createdBody.agent.currentConfigurationVersion).not.toHaveProperty(
      "toolGrants"
    )
  })

  it("returns API-backed detail information for tools, activity, and library", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Test Research Agent",
      prompt: "Check GitHub updates",
      model: agent.model,
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    })
    ctx.repos.runs.updateStatus(createdThread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
    })
    ctx.repos.artifacts.create({
      title: "Research notes",
      type: "document",
      mimeType: "text/markdown",
      sizeBytes: 42,
      storageKey: "research-notes.md",
      previewText: "Summary",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      threadId: createdThread.thread.id,
      threadTitleSnapshot: createdThread.thread.title,
      runId: createdThread.run.id,
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}`)

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      toolGrants: { toolkitSlug: string; connectionId?: string }[]
      information: {
        recentThreads: {
          id: string
          title: string
          lastRunStatus?: string
          artifactCount?: number
        }[]
        library: {
          totalCount: number
          items: { title: string; storageKey?: string }[]
        }
      }
    }
    expect(body.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])
    expect(body.information.recentThreads).toMatchObject([
      {
        id: createdThread.thread.id,
        title: "Test Research Agent",
        lastRunStatus: "completed",
        artifactCount: 1,
      },
    ])
    expect(body.information.library.totalCount).toBe(1)
    expect(body.information.library.items).toMatchObject([
      { title: "Research notes" },
    ])
    expect(body.information.library.items[0]).not.toHaveProperty("storageKey")
  })

  it("returns empty detail information for a fresh agent", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Fresh Agent",
      systemPrompt: "Help with fresh work.",
      model: "gpt-4o-mini",
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}`)

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      information: {
        recentThreads: unknown[]
        library: { totalCount: number; items: unknown[] }
      }
    }
    expect(body.information.recentThreads).toEqual([])
    expect(body.information.library).toEqual({ totalCount: 0, items: [] })
  })

  it("returns not found when loading detail for an unknown agent", async () => {
    ctx = createTestContext()
    const app = createAgentTestApp(ctx)

    const response = await app.request("/api/agents/missing")

    expect(response.status).toBe(404)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("agent_not_found")
  })

  it("starts an agent test thread from the selected configuration version grant snapshot", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const slack = ctx.repos.integrationConnections.create({
      toolkitSlug: "slack",
      status: "connected",
      composioConnectedAccountId: "acct-slack",
    })
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )
    const updated = ctx.repos.agents.update(agent.id, {
      toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
    })!
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Check Slack updates" }),
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      thread: {
        id: string
        agentId?: string
        agentNameSnapshot?: string
        agentConfigurationVersionId?: string
        model: string
      }
      message: { role: string }
      run: {
        id: string
        agentId?: string
        agentConfigurationVersionId?: string
        model: string
      }
    }
    expect(updated.currentConfigurationVersion.version).toBe(2)
    expect(body.thread).toMatchObject({
      agentId: agent.id,
      agentNameSnapshot: "Research Agent",
      agentConfigurationVersionId: updated.currentConfigurationVersion.id,
      model: "gpt-4o-mini",
    })
    expect(body.message.role).toBe("user")
    expect(body.run).toMatchObject({
      agentId: agent.id,
      agentConfigurationVersionId: updated.currentConfigurationVersion.id,
      model: "gpt-4o-mini",
    })
    expect(
      ctx.repos.toolAccessGrants.listByScope("thread", body.thread.id)
    ).toMatchObject([{ toolkitSlug: "slack", connectionId: slack.id }])
  })

  it("rejects agent test threads when the saved grant snapshot is disconnected", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )
    ctx.repos.integrationConnections.deleteByToolkitSlug("github")
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Check GitHub repositories" }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as {
      error: string
      remediation?: string
    }
    expect(body.error).toBe("toolkit_not_connected")
    expect(body.remediation).toBe(
      "Connect the toolkit from Integrations before granting it to an agent."
    )
    expect(ctx.repos.threads.list()).toHaveLength(0)
  })

  it("returns a structured error when agent test-thread creation fails", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    vi.spyOn(
      ctx.repos.agents,
      "getCurrentConfigurationSnapshot"
    ).mockImplementation(() => {
      throw new Error("Snapshot load failed")
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Check GitHub repositories" }),
    })

    expect(response.status).toBe(500)
    const body = (await response.json()) as { code: string; error: string }
    expect(body.code).toBe("agent_test_thread_creation_failed")
    expect(body.error).toBe("Snapshot load failed")
  })

  it("rejects invalid agent test-thread requests", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const app = createAgentTestApp(ctx)

    const response = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_agent_test_thread")
  })

  it("returns not found when starting a test thread for an unknown agent", async () => {
    ctx = createTestContext()
    const app = createAgentTestApp(ctx)

    const response = await app.request("/api/agents/missing/test-thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Check GitHub repositories" }),
    })

    expect(response.status).toBe(404)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("agent_not_found")
  })
})
