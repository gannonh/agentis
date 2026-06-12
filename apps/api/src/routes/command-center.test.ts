import { afterEach, describe, expect, it } from "vitest"
import {
  commandCenterNeedsAttentionResponseSchema,
  GENERIC_AGENTIS_AGENT_ID,
} from "@workspace/shared"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { MOCK_MODEL_COST_USD } from "../cost/run-cost-attribution.js"
import { evaluateCompletedRun } from "../evaluation/run-evaluator.js"
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

    const recentRunsResponse = await app.request(
      "/api/command-center/recent-runs"
    )
    expect(recentRunsResponse.status).toBe(200)
    const recentRuns = (await recentRunsResponse.json()) as {
      id: string
      threadId: string
      title: string
      costUsd: number
      evaluationScore: number | null
    }[]
    expect(recentRuns).toEqual([
      expect.objectContaining({
        id: thread.run.id,
        threadId: thread.thread.id,
        title: "Ops run",
        costUsd,
        evaluationScore: null,
      }),
    ])
  })

  it("returns average and per-run evaluation scores when rubrics exist", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Scored Agent",
        systemPrompt: "Score runs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    ctx.repos.rubrics.create({
      name: "Quality rubric",
      agentId: agent.id,
      criteria: [{ name: "Accuracy", weight: 1 }],
    })

    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Scored run",
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
    })
    const evaluation = evaluateCompletedRun(ctx.repos, thread.run.id)
    expect(evaluation).not.toBeNull()

    const summaryResponse = await app.request("/api/command-center/summary")
    expect(summaryResponse.status).toBe(200)
    expect(await summaryResponse.json()).toEqual(
      expect.objectContaining({
        avgScore: evaluation?.score,
        evaluatedRunCount: 1,
      })
    )

    const rosterResponse = await app.request("/api/command-center/roster")
    expect(rosterResponse.status).toBe(200)
    expect(await rosterResponse.json()).toEqual([
      expect.objectContaining({
        agentId: agent.id,
        avgScore: evaluation?.score,
        evaluatedRunCount: 1,
      }),
    ])

    const recentRunsResponse = await app.request(
      "/api/command-center/recent-runs"
    )
    expect(recentRunsResponse.status).toBe(200)
    expect(await recentRunsResponse.json()).toEqual([
      expect.objectContaining({
        id: thread.run.id,
        evaluationScore: evaluation?.score,
      }),
    ])
  })

  it("returns typed needs-attention items for failed runs, pending suggestions, and low scores", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Attention Agent",
        systemPrompt: "Surface operational issues",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    const agentConfigurationVersionId =
      ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id

    const failedThread = ctx.repos.threads.createWithInitialRun({
      title: "Broken workflow",
      prompt: "Fail this",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    ctx.repos.runs.updateStatus(failedThread.run.id, "failed", {
      finishedAt: "2026-06-09T12:05:00.000Z",
      errorSummary: "Tool call failed",
    })

    const lowScoreThread = ctx.repos.threads.createWithInitialRun({
      title: "Weak answer",
      prompt: "Answer poorly",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    ctx.repos.runs.updateStatus(lowScoreThread.run.id, "completed", {
      finishedAt: "2026-06-09T12:10:00.000Z",
      cost: MOCK_MODEL_COST_USD,
    })
    ctx.repos.runs.saveEvaluation(lowScoreThread.run.id, {
      rubricId: "rubric_quality",
      rubricName: "Quality rubric",
      score: 45,
      evaluatedAt: "2026-06-09T12:11:00.000Z",
      criteria: [
        {
          criterionId: "criterion_accuracy",
          criterionName: "Accuracy",
          weight: 1,
          score: 45,
          feedback: "Missed the requested evidence.",
        },
      ],
    })

    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Remember citation preference",
      content: "User prefers citations.",
      confidence: 0.8,
      sourceThreadId: failedThread.thread.id,
      sourceThreadTitle: failedThread.thread.title,
      agentId: agent.id,
    })

    const response = await app.request("/api/command-center/needs-attention")
    expect(response.status).toBe(200)
    const body = commandCenterNeedsAttentionResponseSchema.parse(
      await response.json()
    )
    expect(body.totalCount).toBe(3)
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "failed_run",
          title: "Run failed: Broken workflow",
          description: "Tool call failed",
          href: `/threads/${failedThread.thread.id}`,
          runId: failedThread.run.id,
          dismissible: false,
        }),
        expect.objectContaining({
          type: "pending_learning_suggestion",
          title: "Remember citation preference",
          href: `/learning?status=pending&suggestionId=${suggestion.id}`,
          suggestionId: suggestion.id,
          dismissible: true,
        }),
        expect.objectContaining({
          type: "low_score_run",
          title: "Low score: Weak answer",
          description: "45% on Quality rubric",
          href: `/threads/${lowScoreThread.thread.id}`,
          runId: lowScoreThread.run.id,
          score: 45,
        }),
      ])
    )
  })

  it("returns failed-run needs-attention items when learning and evaluation data are absent", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Partial Queue Agent",
        systemPrompt: "Fail loudly",
        model: "openai/gpt-5.4-mini",
      },
      []
    )

    const failedThread = ctx.repos.threads.createWithInitialRun({
      title: "Failed only",
      prompt: "Fail this",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId:
        ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
    })
    ctx.repos.runs.updateStatus(failedThread.run.id, "failed", {
      finishedAt: "2026-06-09T12:05:00.000Z",
    })

    const response = await app.request("/api/command-center/needs-attention")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      totalCount: 1,
      items: [
        expect.objectContaining({
          type: "failed_run",
          title: "Run failed: Failed only",
          href: `/threads/${failedThread.thread.id}`,
        }),
      ],
    })
  })

  it("keeps each attention type visible when recent failures dominate the queue", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Queue Balance Agent",
        systemPrompt: "Surface mixed issues",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    const agentConfigurationVersionId =
      ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id

    for (let index = 0; index < 25; index += 1) {
      const failedThread = ctx.repos.threads.createWithInitialRun({
        title: `Failure ${index}`,
        prompt: "Fail this",
        model: "openai/gpt-5.4-mini",
        mode: "agent",
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        agentConfigurationVersionId,
      })
      ctx.repos.runs.updateStatus(failedThread.run.id, "failed", {
        finishedAt: `2026-06-09T12:${String(index).padStart(2, "0")}:00.000Z`,
      })
    }

    const lowScoreThread = ctx.repos.threads.createWithInitialRun({
      title: "Older weak answer",
      prompt: "Answer poorly",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId,
    })
    ctx.repos.runs.updateStatus(lowScoreThread.run.id, "completed", {
      finishedAt: "2026-06-08T12:00:00.000Z",
      cost: MOCK_MODEL_COST_USD,
    })
    ctx.repos.runs.saveEvaluation(lowScoreThread.run.id, {
      rubricId: "rubric_quality",
      rubricName: "Quality rubric",
      score: 45,
      evaluatedAt: "2026-06-08T12:01:00.000Z",
      criteria: [
        {
          criterionId: "criterion_accuracy",
          criterionName: "Accuracy",
          weight: 1,
          score: 45,
          feedback: "Missed the requested evidence.",
        },
      ],
    })

    const suggestion = ctx.repos.learningSuggestions.create({
      suggestionType: "memory",
      title: "Older pending memory",
      content: "User prefers citations.",
      confidence: 0.8,
      sourceThreadId: lowScoreThread.thread.id,
      sourceThreadTitle: lowScoreThread.thread.title,
      agentId: agent.id,
    })

    const response = await app.request("/api/command-center/needs-attention")
    expect(response.status).toBe(200)
    const body = commandCenterNeedsAttentionResponseSchema.parse(
      await response.json()
    )
    expect(body.totalCount).toBe(27)
    expect(body.items).toHaveLength(20)
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "pending_learning_suggestion",
          suggestionId: suggestion.id,
        }),
        expect.objectContaining({
          type: "low_score_run",
          runId: lowScoreThread.run.id,
        }),
      ])
    )
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

    const recentRunsResponse = await app.request(
      "/api/command-center/recent-runs"
    )
    expect(recentRunsResponse.status).toBe(200)
    expect(await recentRunsResponse.json()).toEqual([])
  })

  it("returns empty roster and recent runs when no runs exist", async () => {
    ctx = createTestContext()
    const app = createCommandCenterTestApp(ctx)

    const rosterResponse = await app.request("/api/command-center/roster")
    expect(rosterResponse.status).toBe(200)
    expect(await rosterResponse.json()).toEqual([])

    const recentRunsResponse = await app.request(
      "/api/command-center/recent-runs"
    )
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

    const recentRunsResponse = await app.request(
      "/api/command-center/recent-runs"
    )
    expect(recentRunsResponse.status).toBe(200)
    const recentRuns = (await recentRunsResponse.json()) as { id: string }[]
    expect(recentRuns).toHaveLength(1)
    expect(recentRuns[0]?.id).toBe(namedThread.run.id)
  })
})
