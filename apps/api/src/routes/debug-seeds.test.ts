import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

function createDebugSeedTestApp(context: TestContext) {
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

describe("debug seed routes", () => {
  it("seeds the rich agent workspace scenario idempotently for manual and e2e testing", async () => {
    ctx = createTestContext()
    const app = createDebugSeedTestApp(ctx)

    const first = await app.request("/api/debug/datasets/rich-agent-workspace", {
      method: "POST",
    })
    const second = await app.request("/api/debug/datasets/rich-agent-workspace", {
      method: "POST",
    })

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
    expect(ctx.repos.agents.list().map((agent) => agent.toolGrantCount)).toEqual([
      2,
      2,
      3,
      1,
      0,
    ])

    const support = await app.request("/api/agents/seed_agent_support_triage")
    expect(support.status).toBe(200)
    const supportBody = (await support.json()) as {
      agent: { sourceThread?: { title: string } }
      information: { recentThreads: unknown[]; library: { totalCount: number } }
    }
    expect(supportBody.agent.sourceThread?.title).toBe(
      "Support escalations triage workflow"
    )
    expect(supportBody.information.recentThreads.length).toBeGreaterThan(0)
    expect(supportBody.information.library.totalCount).toBeGreaterThan(0)
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
})
