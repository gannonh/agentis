import { afterEach, describe, expect, it } from "vitest"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { MOCK_MODEL_COST_USD } from "../cost/run-cost-attribution.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createCommandCenterTestApp(context: TestContext) {
  return createApp(
    context.repos,
    { ...context.config, mockRuntime: true, webSearchProvider: "mock" },
    createComposioServices(context.repos, context.config)
  )
}

describe("command center routes", () => {
  it("returns roster metrics and recent runs for completed agent runs", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Ops Agent",
        systemPrompt: "Track costs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )

    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Ops run",
      prompt: "Hello",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId:
        ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
    })

    const costUsd = MOCK_MODEL_COST_USD
    ctx.repos.runs.updateStatus(thread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
      usage: { promptTokens: 1, completionTokens: 10, totalTokens: 11 },
      cost: costUsd,
      costBreakdown: {
        totalUsd: costUsd,
        lineItems: [
          {
            category: "model",
            provider: "mock",
            model: "openai/gpt-5.4-mini",
            costUsd,
          },
        ],
      },
    })

    const rosterResponse = await app.request("/api/command-center/roster")
    expect(rosterResponse.status).toBe(200)
    const roster = (await rosterResponse.json()) as {
      agentId: string
      runCount: number
      totalCostUsd: number
      lastRunAt: string | null
      activeRunCount: number
    }[]
    expect(roster).toEqual([
      expect.objectContaining({
        agentId: agent.id,
        runCount: 1,
        totalCostUsd: costUsd,
        activeRunCount: 0,
      }),
    ])
    expect(roster[0]?.lastRunAt).toBeTruthy()

    const recentRunsResponse = await app.request("/api/command-center/recent-runs")
    expect(recentRunsResponse.status).toBe(200)
    const recentRuns = (await recentRunsResponse.json()) as {
      id: string
      threadId: string
      title: string
      costUsd: number
    }[]
    expect(recentRuns).toEqual([
      expect.objectContaining({
        id: thread.run.id,
        threadId: thread.thread.id,
        title: "Ops run",
        costUsd,
      }),
    ])
  })

  it("excludes active runs from recent completed runs", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Active Ops Agent",
        systemPrompt: "Track active work",
        model: "openai/gpt-5.4-mini",
      },
      []
    )

    ctx.repos.threads.createWithInitialRun({
      title: "Running ops run",
      prompt: "Keep working",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId:
        ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
    })

    const recentRunsResponse = await app.request("/api/command-center/recent-runs")
    expect(recentRunsResponse.status).toBe(200)
    expect(await recentRunsResponse.json()).toEqual([])
  })

  it("returns empty roster and recent runs when no runs exist", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)

    const rosterResponse = await app.request("/api/command-center/roster")
    expect(rosterResponse.status).toBe(200)
    expect(await rosterResponse.json()).toEqual([])

    const recentRunsResponse = await app.request("/api/command-center/recent-runs")
    expect(recentRunsResponse.status).toBe(200)
    expect(await recentRunsResponse.json()).toEqual([])
  })

  it("excludes generic Agentis runs from roster and recent runs", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Ops Agent",
        systemPrompt: "Track costs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )

    const namedThread = ctx.repos.threads.createWithInitialRun({
      title: "Named ops run",
      prompt: "Hello",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId:
        ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
    })
    ctx.repos.runs.updateStatus(namedThread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
      cost: MOCK_MODEL_COST_USD,
    })

    const genericThread = ctx.repos.threads.createWithInitialRun({
      title: "Generic ops run",
      prompt: "Hello",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: GENERIC_AGENTIS_AGENT_ID,
    })
    ctx.repos.runs.updateStatus(genericThread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
      cost: MOCK_MODEL_COST_USD,
    })

    const rosterResponse = await app.request("/api/command-center/roster")
    expect(rosterResponse.status).toBe(200)
    const roster = (await rosterResponse.json()) as { agentId: string }[]
    expect(roster).toHaveLength(1)
    expect(roster[0]?.agentId).toBe(agent.id)

    const recentRunsResponse = await app.request("/api/command-center/recent-runs")
    expect(recentRunsResponse.status).toBe(200)
    const recentRuns = (await recentRunsResponse.json()) as { id: string }[]
    expect(recentRuns).toHaveLength(1)
    expect(recentRuns[0]?.id).toBe(namedThread.run.id)
  })
})
