import { describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { runs } from "../db/schema.js"
import { createTestContext } from "../test/setup.js"
import {
  MOCK_MODEL_COST_USD,
  MOCK_WEB_SEARCH_COST_USD,
} from "../cost/run-cost-attribution.js"

describe("RunRepository cost aggregation", () => {
  it("aggregates agent usage and command center summary", () => {
    const ctx = createTestContext()
    try {
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

      const roster = ctx.repos.runs.getAgentRosterMetrics()
      expect(roster).toEqual([
        expect.objectContaining({
          agentId: agent.id,
          runCount: 1,
          totalCostUsd: costUsd,
          activeRunCount: 0,
        }),
      ])

      const recentRuns = ctx.repos.runs.listRecentRuns()
      expect(recentRuns).toEqual([
        expect.objectContaining({
          id: thread.run.id,
          threadId: thread.thread.id,
          title: "Cost test",
          costUsd,
        }),
      ])
    } finally {
      ctx.cleanup()
    }
  })

  it("skips malformed usageJson when aggregating agent usage", () => {
    const ctx = createTestContext()
    try {
      const agent = ctx.repos.agents.createWithGrants(
        {
          name: "Ops Agent",
          systemPrompt: "Track costs",
          model: "openai/gpt-5.4-mini",
        },
        []
      )

      const thread = ctx.repos.threads.createWithInitialRun({
        title: "Malformed usage",
        prompt: "Hello",
        model: "openai/gpt-5.4-mini",
        mode: "agent",
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        agentConfigurationVersionId:
          ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
      })

      ctx.repos.runs.updateStatus(thread.run.id, "completed", {
        finishedAt: new Date().toISOString(),
        cost: MOCK_MODEL_COST_USD,
        costBreakdown: {
          totalUsd: MOCK_MODEL_COST_USD,
          lineItems: [
            {
              category: "model",
              provider: "mock",
              model: "openai/gpt-5.4-mini",
              costUsd: MOCK_MODEL_COST_USD,
            },
          ],
        },
      })

      ctx.db
        .update(runs)
        .set({ usageJson: "{not-json" })
        .where(eq(runs.id, thread.run.id))
        .run()

      const usage = ctx.repos.runs.getAgentUsage(agent.id)
      expect(usage.totalRuns).toBe(1)
      expect(usage.totalCostUsd).toBe(MOCK_MODEL_COST_USD)
      expect(usage.byModel).toEqual([
        expect.objectContaining({
          model: "openai/gpt-5.4-mini",
          costUsd: MOCK_MODEL_COST_USD,
          runCount: 1,
          promptTokens: 0,
          completionTokens: 0,
        }),
      ])
    } finally {
      ctx.cleanup()
    }
  })
})
