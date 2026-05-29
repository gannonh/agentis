import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import { GENERIC_AGENTIS_WORKSPACE_ID } from "../workspaces/constants.js"
import { WorkspaceService } from "../workspaces/workspace-service.js"

let ctx: TestContext | undefined

function createDebugSeedTestApp(context: TestContext) {
  return createApp(
    context.repos,
    {
      ...context.config,
      nodeEnv: "development",
    },
    createComposioServices(context.repos, context.config)
  )
}

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("debug seed routes", () => {
  it("seeds the rich agent workspace scenario idempotently for manual and e2e testing", async () => {
    ctx = createTestContext()
    const app = createDebugSeedTestApp(ctx)

    const first = await app.request(
      "/api/debug/datasets/rich-agent-workspace",
      { method: "POST" }
    )
    const second = await app.request(
      "/api/debug/datasets/rich-agent-workspace",
      { method: "POST" }
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const body = (await second.json()) as {
      dataset: { id: string; name: string }
      counts: Record<string, number>
    }
    expect(body.dataset).toMatchObject({
      id: "rich-agent-workspace",
      name: "Rich agent workspace",
    })
    expect(body.counts).toMatchObject({
      agents: 5,
      projects: 2,
      threads: 5,
      artifacts: 6,
      savedMemories: 8,
      integrationConnections: 5,
    })

    expect(ctx.repos.agents.list().map((agent) => agent.id)).toEqual([
      "seed_agent_customer_insights",
      "seed_agent_docs_ops",
      "seed_agent_launch_pm",
      "seed_agent_research_librarian",
      "seed_agent_support_triage",
    ])
    expect(
      ctx.repos.agents.list().map((agent) => agent.toolGrantCount)
    ).toEqual([2, 2, 3, 1, 0])

    const support = await app.request("/api/agents/seed_agent_support_triage")
    expect(support.status).toBe(200)
    const supportBody = (await support.json()) as {
      agent: { sourceThread?: { title: string } }
      information: {
        recentThreads: unknown[]
        library: { totalCount: number }
        memories: { global: unknown[]; agent: unknown[] }
      }
    }
    expect(supportBody.agent.sourceThread?.title).toBe(
      "Support escalations triage workflow"
    )
    expect(supportBody.information.recentThreads.length).toBeGreaterThan(0)
    expect(supportBody.information.library.totalCount).toBeGreaterThan(0)
    expect(supportBody.information.memories.global.length).toBeGreaterThan(0)
    expect(supportBody.information.memories.agent.length).toBeGreaterThan(0)
    expect(ctx.repos.threads.getById("seed_thread_support_triage")).toMatchObject({
      agentId: "seed_agent_support_triage",
      workspaceId: "workspace_seed_agent_support_triage",
    })

    const workspace = await new WorkspaceService(
      ctx.repos,
      ctx.config
    ).openWorkspace(GENERIC_AGENTIS_WORKSPACE_ID)
    const listing = await workspace.list({ recursive: true })
    expect(listing.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "README.md", type: "file" }),
        expect.objectContaining({ path: "notes/demo-workspace.md", type: "file" }),
      ])
    )
  })

  it("links accepted seeded memories to their source agent threads", async () => {
    ctx = createTestContext()
    const app = createDebugSeedTestApp(ctx)

    await app.request("/api/debug/datasets/rich-agent-workspace", {
      method: "POST",
    })
    const response = await app.request("/api/memories")

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      memories: {
        id: string
        scope: string
        associatedAgent?: string
        sourceThreadId?: string
        sourceThreadTitle?: string
      }[]
    }
    const launchMemory = body.memories.find(
      (memory) => memory.id === "seed_memory_project_context_launch"
    )

    expect(launchMemory).toMatchObject({
      scope: "agent",
      associatedAgent: "seed_agent_launch_pm",
      sourceThreadId: "seed_thread_launch_plan",
      sourceThreadTitle: "Launch readiness weekly update",
    })
    const richSeedMemories = body.memories.filter((memory) =>
      memory.id.startsWith("seed_memory_")
    )
    expect(
      richSeedMemories.filter((memory) => memory.sourceThreadId).length
    ).toBe(richSeedMemories.length)
  })

  it("seeds a rich workspace version with no connected integrations", async () => {
    ctx = createTestContext()
    const app = createDebugSeedTestApp(ctx)

    const response = await app.request(
      "/api/debug/datasets/rich-agent-workspace-no-integrations",
      { method: "POST" }
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      dataset: { id: string; name: string }
      counts: Record<string, number>
    }
    expect(body.dataset).toMatchObject({
      id: "rich-agent-workspace-no-integrations",
      name: "Rich agent workspace, no integrations",
    })
    expect(body.counts).toMatchObject({
      agents: 5,
      projects: 2,
      threads: 5,
      artifacts: 6,
      savedMemories: 8,
      integrationConnections: 0,
    })
    expect(ctx.repos.integrationConnections.listByUserId()).toHaveLength(0)
    expect(
      ctx.repos.agents.list().map((agent) => agent.toolGrantCount)
    ).toEqual([0, 0, 0, 0, 0])

    const integrations = await app.request("/api/integrations")
    const integrationsBody = (await integrations.json()) as {
      toolkits: {
        slug: string
        status: string
        connectedAccountCount: number
      }[]
    }
    expect(integrationsBody.toolkits).toHaveLength(5)
    expect(
      integrationsBody.toolkits.every(
        (toolkit) =>
          toolkit.status === "not_connected" &&
          toolkit.connectedAccountCount === 0
      )
    ).toBe(true)
  })

  it("deletes only the rich agent workspace scenario data", async () => {
    ctx = createTestContext()
    const unrelated = ctx.repos.agents.create({
      name: "Keep Me",
      systemPrompt: "Remain after debug seed deletion.",
      model: "gpt-4o-mini",
    })
    const app = createDebugSeedTestApp(ctx)

    await app.request("/api/debug/datasets/rich-agent-workspace", {
      method: "POST",
    })
    const response = await app.request(
      "/api/debug/datasets/rich-agent-workspace",
      { method: "DELETE" }
    )

    expect(response.status).toBe(200)
    expect(ctx.repos.agents.list().map((agent) => agent.id)).toEqual([
      unrelated.id,
    ])
    expect(ctx.repos.threads.list()).toHaveLength(0)
    expect(ctx.repos.projects.list({ includeArchived: true })).toHaveLength(0)
    expect(ctx.repos.artifacts.list()).toHaveLength(0)
    expect(
      ctx.repos.savedMemories
        .list()
        .memories.filter((memory) => memory.id.startsWith("seed_memory_"))
    ).toHaveLength(0)
  })

  it("returns a 404 for unknown debug datasets", async () => {
    ctx = createTestContext()
    const app = createDebugSeedTestApp(ctx)

    const response = await app.request("/api/debug/datasets/unknown", {
      method: "POST",
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: "Debug dataset not found",
      code: "debug_dataset_not_found",
    })
  })

  it("deletes all workspace data for a full local reset", async () => {
    ctx = createTestContext()
    const app = createDebugSeedTestApp(ctx)

    await app.request("/api/debug/datasets/rich-agent-workspace", {
      method: "POST",
    })
    const project = ctx.repos.projects.create({ name: "Unrelated project" })
    const agent = ctx.repos.agents.create({
      name: "Unrelated agent",
      systemPrompt: "Remain after seed deletion.",
      model: "gpt-4o-mini",
    })
    ctx.repos.threads.createWithInitialRun({
      title: "Unrelated thread",
      model: "gpt-4o-mini",
      mode: "agent",
      prompt: "Keep this unless all data is deleted.",
      projectId: project.id,
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    })
    ctx.repos.savedMemories.create({
      content: "Unrelated memory",
      category: "memory_category_project_context",
      usageGuidance: "Use only before reset.",
      tags: ["reset"],
      importance: "medium",
      scope: "global",
      pinnedToContext: false,
    })

    const response = await app.request("/api/debug/data", { method: "DELETE" })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      counts: {
        agents: 0,
        projects: 0,
        threads: 0,
        artifacts: 0,
        savedMemories: 0,
        projectMemories: 0,
        integrationConnections: 0,
      },
    })
    expect(ctx.repos.agents.list()).toHaveLength(0)
    expect(ctx.repos.threads.list()).toHaveLength(0)
    expect(ctx.repos.projects.list({ includeArchived: true })).toHaveLength(0)
    expect(ctx.repos.artifacts.list()).toHaveLength(0)
    expect(ctx.repos.savedMemories.list().memories).toHaveLength(0)
    expect(ctx.repos.integrationConnections.listByUserId()).toHaveLength(0)
    expect(ctx.repos.integrationToolkits.listFeatured()).toHaveLength(5)
  })

  it("mounts debug seeding routes in development mode", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      nodeEnv: "development",
    })

    const response = await app.request("/api/debug/datasets")

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      datasets: [
        {
          id: "rich-agent-workspace",
          name: "Rich agent workspace",
        },
        {
          id: "rich-agent-workspace-no-integrations",
          name: "Rich agent workspace, no integrations",
        },
      ],
    })
  })

  it("does not mount debug seeding routes outside development mode", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      nodeEnv: "test",
    })

    const response = await app.request("/api/debug/datasets")

    expect(response.status).toBe(404)
  })

  it("does not mount debug seeding routes in production", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      nodeEnv: "production",
    })

    const response = await app.request("/api/debug/datasets")

    expect(response.status).toBe(404)
  })
})
