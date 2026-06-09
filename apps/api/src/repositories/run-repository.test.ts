import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { MOCK_MODEL_COST_USD, MOCK_WEB_SEARCH_COST_USD } from "../cost/run-cost-attribution.js"

describe("RunRepository cost aggregation", () => {
  it("aggregates agent usage and command center summary", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Research",
        model: "openai/gpt-5.4-mini",
      },
      []
    )

    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Cost test",
      prompt: "Search the web",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId:
        ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
    })

    const costUsd = MOCK_MODEL_COST_USD + MOCK_WEB_SEARCH_COST_USD
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
            costUsd: MOCK_MODEL_COST_USD,
          },
          {
            category: "tool",
            provider: "mock",
            toolName: "searchWeb",
            costUsd: MOCK_WEB_SEARCH_COST_USD,
          },
        ],
      },
    })

    const usage = ctx.repos.runs.getAgentUsage(agent.id)
    expect(usage.totalRuns).toBe(1)
    expect(usage.totalCostUsd).toBe(costUsd)
    expect(usage.byModel).toEqual([
      expect.objectContaining({
        model: "openai/gpt-5.4-mini",
        costUsd,
        runCount: 1,
      }),
    ])

    const summary = ctx.repos.runs.getCommandCenterSummary(
      ctx.repos.agents.list().length
    )
    expect(summary.totalRuns).toBe(1)
    expect(summary.totalCostUsd).toBe(costUsd)
    expect(summary.activeRuns).toBe(0)
    expect(summary.agentCount).toBeGreaterThan(0)

    ctx.cleanup()
  })
})
