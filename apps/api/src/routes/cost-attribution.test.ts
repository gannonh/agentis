import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import {
  MOCK_MODEL_COST_USD,
  MOCK_WEB_SEARCH_COST_USD,
} from "../cost/run-cost-attribution.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createCostTestApp(context: TestContext) {
  return createApp(
    context.repos,
    { ...context.config, mockRuntime: true, webSearchProvider: "mock" },
    createComposioServices(context.repos, context.config)
  )
}

describe("cost attribution routes", () => {
  it("returns run cost after mock web search completion", async () => {
    ctx = createTestContext()
    const app = createCostTestApp(ctx)

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Search the web for Agentis release notes",
        mode: "agent",
      }),
    })
    expect(created.status).toBe(201)
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const detail = await app.request(`/api/runs/${run.id}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      status: string
      costUsd?: number
      cost?: number
      costBreakdown?: { totalUsd: number; lineItems: unknown[] }
    }
    expect(body.status).toBe("completed")
    expect(body.costUsd).toBe(MOCK_MODEL_COST_USD + MOCK_WEB_SEARCH_COST_USD)
    expect(body.cost).toBe(body.costUsd)
    expect(body.costBreakdown?.lineItems.length).toBe(2)
  }, 15_000)

  it("returns agent usage and command center summary aggregates", async () => {
    ctx = createTestContext()
    const app = createCostTestApp(ctx)
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

    const usageResponse = await app.request(`/api/agents/${agent.id}/usage`)
    expect(usageResponse.status).toBe(200)
    const usage = (await usageResponse.json()) as {
      totalCostUsd: number
      totalRuns: number
      byModel: { model: string; costUsd: number }[]
    }
    expect(usage.totalRuns).toBe(1)
    expect(usage.totalCostUsd).toBe(costUsd)
    expect(usage.byModel[0]?.model).toBe("openai/gpt-5.4-mini")

    const summaryResponse = await app.request("/api/command-center/summary")
    expect(summaryResponse.status).toBe(200)
    const summary = (await summaryResponse.json()) as {
      totalCostUsd: number
      totalRuns: number
      activeRuns: number
      agentCount: number
    }
    expect(summary.totalRuns).toBe(1)
    expect(summary.totalCostUsd).toBe(costUsd)
    expect(summary.activeRuns).toBe(0)
    expect(summary.agentCount).toBeGreaterThan(0)
  })
})
