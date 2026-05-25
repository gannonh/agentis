import { afterEach, describe, expect, it, vi } from "vitest"
import { createComposioServices } from "../composio/index.js"
import { createApp } from "../app.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import { formatToolStepTitle } from "./run-executor.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("run executor composio bridge", () => {
  it("keeps the createArtifact step title when finalizing tool calls", () => {
    expect(
      formatToolStepTitle({ toolName: "createArtifact", curated: false })
    ).toBe("Create artifact")
  })

  it("returns remediation when Slack is requested without grant", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, { ...ctx.config, mockRuntime: true }, services)

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Post this update to Slack" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(400)
    const failedRun = ctx.repos.runs.getById(run.id)
    expect(failedRun?.status).toBe("failed")
    const steps = ctx.repos.steps.listByRunId(run.id)
    expect(
      steps.some(
        (step) =>
          step.title === "Integration required" ||
          step.payload?.remediation === "toolkit_not_connected"
      )
    ).toBe(true)
  })

  it("loads the bound agent configuration version when streaming a test-thread run", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, { ...ctx.config, mockRuntime: true }, services)
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const updated = ctx.repos.agents.update(agent.id, {
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
    })!
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(ctx.repos.runs.getById(run.id)).toMatchObject({
      status: "completed",
      model: "gpt-4.1-mini",
      agentConfigurationVersionId: updated.currentConfigurationVersion.id,
    })
    expect(ctx.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Agent configuration loaded",
          payload: expect.objectContaining({
            agentId: agent.id,
            agentConfigurationVersionId: updated.currentConfigurationVersion.id,
            model: "gpt-4.1-mini",
          }),
        }),
      ])
    )
  }, 10_000)

  it("fails the run and thread when the bound agent configuration is missing", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, { ...ctx.config, mockRuntime: true }, services)
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { thread, run } = (await created.json()) as {
      thread: { id: string }
      run: { id: string; agentConfigurationVersionId: string }
    }
    vi.spyOn(ctx.repos.agents, "getConfigurationVersionById").mockReturnValue(
      null
    )

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })

    expect(stream.status).toBe(404)
    const message = `Agent configuration version not found: ${run.agentConfigurationVersionId}`
    expect(ctx.repos.runs.getById(run.id)).toMatchObject({
      status: "failed",
      errorSummary: message,
    })
    expect(ctx.repos.threads.getById(thread.id)?.status).toBe("failed")
    expect(ctx.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "error",
          status: "failed",
          title: "Run failed",
          payload: expect.objectContaining({ message }),
        }),
      ])
    )
  })

  it("keeps the agent configuration binding on follow-up runs", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, { ...ctx.config, mockRuntime: true }, services)
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const updated = ctx.repos.agents.update(agent.id, {
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
    })!
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { thread } = (await created.json()) as { thread: { id: string } }

    const followUp = await app.request(`/api/threads/${thread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Continue with source quality notes" }),
    })
    const { run } = (await followUp.json()) as {
      run: { id: string; agentConfigurationVersionId?: string }
    }

    expect(run.agentConfigurationVersionId).toBe(
      updated.currentConfigurationVersion.id
    )

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(ctx.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Agent configuration loaded",
          payload: expect.objectContaining({
            agentConfigurationVersionId: updated.currentConfigurationVersion.id,
          }),
        }),
      ])
    )
  }, 10_000)
})
