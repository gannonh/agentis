import { afterEach, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { MOCK_MODEL_COST_USD } from "../cost/run-cost-attribution.js"
import { runs } from "../db/schema.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("RunRepository fleet observability", () => {
  it("returns empty score trends and cost breakdown on a fresh install", () => {
    ctx = createTestContext()

    const trends = ctx.repos.runs.getFleetScoreTrends(90)
    expect(trends.periodDays).toBe(90)
    expect(trends.evaluatedRunCount).toBe(0)
    expect(trends.daily).toHaveLength(90)
    expect(trends.daily.every((entry) => entry.avgScore === null)).toBe(true)

    const breakdown = ctx.repos.runs.getFleetCostBreakdown(90)
    expect(breakdown.totalRuns).toBe(0)
    expect(breakdown.totalCostUsd).toBe(0)
    expect(breakdown.byModel).toEqual([])
    expect(breakdown.byProvider).toEqual([])
  })

  it("aggregates fleet score trends by day and ignores corrupt evaluation JSON", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Scored Agent",
        systemPrompt: "Score runs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    const agentConfigurationVersionId =
      ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id
    const startedAt = new Date().toISOString()

    const scoredThread = ctx.repos.threads.createWithInitialRun({
      title: "Scored run",
      prompt: "Hello",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    ctx.repos.runs.updateStatus(scoredThread.run.id, "completed", {
      finishedAt: startedAt,
      cost: MOCK_MODEL_COST_USD,
    })
    ctx.repos.runs.saveEvaluation(scoredThread.run.id, {
      rubricId: "rubric_quality",
      rubricName: "Quality rubric",
      score: 82,
      evaluatedAt: startedAt,
      criteria: [
        {
          criterionId: "criterion_accuracy",
          criterionName: "Accuracy",
          weight: 1,
          score: 82,
          feedback: "Solid answer.",
        },
      ],
    })

    const corruptThread = ctx.repos.threads.createWithInitialRun({
      title: "Corrupt eval",
      prompt: "Bad json",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    ctx.repos.runs.updateStatus(corruptThread.run.id, "completed", {
      finishedAt: startedAt,
      cost: MOCK_MODEL_COST_USD,
    })
    ctx.db
      .update(runs)
      .set({ evaluationJson: "{not-json" })
      .where(eq(runs.id, corruptThread.run.id))
      .run()

    const trends = ctx.repos.runs.getFleetScoreTrends(14)
    expect(trends.evaluatedRunCount).toBe(1)
    const today = startedAt.slice(0, 10)
    expect(trends.daily).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: today,
          avgScore: 82,
          evaluatedRunCount: 1,
        }),
      ])
    )
  })

  it("aggregates fleet cost breakdown by model and provider", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Ops Agent",
        systemPrompt: "Track costs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    const agentConfigurationVersionId =
      ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id

    const modelThread = ctx.repos.threads.createWithInitialRun({
      title: "Model run",
      prompt: "Hello",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    const modelCost = MOCK_MODEL_COST_USD
    ctx.repos.runs.updateStatus(modelThread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
      cost: modelCost,
      costBreakdown: {
        totalUsd: modelCost,
        lineItems: [
          {
            category: "model",
            provider: "mock",
            model: "openai/gpt-5.4-mini",
            costUsd: modelCost,
          },
        ],
      },
    })

    const searchThread = ctx.repos.threads.createWithInitialRun({
      title: "Search run",
      prompt: "Search",
      model: "anthropic/claude-sonnet-4",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    const searchCost = 0.02
    ctx.repos.runs.updateStatus(searchThread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
      cost: searchCost,
      costBreakdown: {
        totalUsd: searchCost,
        lineItems: [
          {
            category: "model",
            provider: "anthropic",
            model: "anthropic/claude-sonnet-4",
            costUsd: 0.011,
          },
          {
            category: "tool",
            provider: "tavily",
            toolName: "searchWeb",
            costUsd: 0.009,
          },
        ],
      },
    })

    const breakdown = ctx.repos.runs.getFleetCostBreakdown(30)
    expect(breakdown.totalRuns).toBe(2)
    expect(breakdown.totalCostUsd).toBeCloseTo(modelCost + searchCost, 6)
    expect(breakdown.byModel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          model: "openai/gpt-5.4-mini",
          costUsd: modelCost,
          runCount: 1,
        }),
        expect.objectContaining({
          model: "anthropic/claude-sonnet-4",
          costUsd: searchCost,
          runCount: 1,
        }),
      ])
    )
    expect(breakdown.byProvider).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "mock", runCount: 1 }),
        expect.objectContaining({ provider: "anthropic", runCount: 1 }),
        expect.objectContaining({ provider: "tavily", runCount: 1 }),
      ])
    )
  })
})
