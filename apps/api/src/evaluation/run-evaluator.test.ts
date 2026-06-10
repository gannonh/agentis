import { afterEach, describe, expect, it } from "vitest"
import { buildRunEvaluation, evaluateCompletedRun } from "./run-evaluator.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("run evaluator", () => {
  it("builds deterministic criterion scores from run and rubric ids", () => {
    const first = buildRunEvaluation({
      runId: "run_eval_test",
      rubricId: "rubric_test",
      rubricName: "Quality rubric",
      criteria: [
        { id: "criterion_a", name: "Accuracy", weight: 2 },
        { id: "criterion_b", name: "Clarity", weight: 1 },
      ],
    })
    const second = buildRunEvaluation({
      runId: "run_eval_test",
      rubricId: "rubric_test",
      rubricName: "Quality rubric",
      criteria: [
        { id: "criterion_a", name: "Accuracy", weight: 2 },
        { id: "criterion_b", name: "Clarity", weight: 1 },
      ],
    })

    expect(second.score).toBe(first.score)
    expect(second.criteria).toEqual(first.criteria)
    expect(first.score).toBeGreaterThanOrEqual(0)
    expect(first.score).toBeLessThanOrEqual(100)
    expect(first.criteria).toHaveLength(2)
  })

  it("persists evaluation when an agent rubric exists", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Eval Agent",
        systemPrompt: "Evaluate runs",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    ctx.repos.rubrics.create({
      name: "Support quality",
      agentId: agent.id,
      criteria: [
        { name: "Resolution", weight: 1 },
        { name: "Tone", weight: 1 },
      ],
    })
    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Eval thread",
      prompt: "Help the user",
      model: "openai/gpt-5.4-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId:
        ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id).id,
    })
    ctx.repos.runs.updateStatus(thread.run.id, "completed", {
      finishedAt: new Date().toISOString(),
    })

    const evaluation = evaluateCompletedRun(ctx.repos, thread.run.id)
    expect(evaluation).not.toBeNull()

    const reloaded = ctx.repos.runs.getById(thread.run.id)
    expect(reloaded?.evaluation).toEqual(evaluation)
  })

  it("skips evaluation when the agent has no rubric", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "No Rubric Agent",
        systemPrompt: "No rubric",
        model: "openai/gpt-5.4-mini",
      },
      []
    )
    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Plain thread",
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
    })

    expect(evaluateCompletedRun(ctx.repos, thread.run.id)).toBeNull()
    expect(ctx.repos.runs.getById(thread.run.id)?.evaluation).toBeUndefined()
  })
})
