import { afterEach, describe, expect, it, vi } from "vitest"
import { createComposioServices } from "../composio/index.js"
import { createApp } from "../app.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import { buildRunSystemPrompt, formatToolStepTitle } from "./run-executor.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createMockRuntimeApp(setup?: (context: TestContext) => void) {
  ctx = createTestContext()
  setup?.(ctx)
  const services = createComposioServices(ctx.repos, ctx.config)
  return {
    app: createApp(ctx.repos, { ...ctx.config, mockRuntime: true }, services),
    context: ctx,
  }
}

describe("run executor composio bridge", () => {
  it("keeps the createArtifact step title when finalizing tool calls", () => {
    expect(
      formatToolStepTitle({ toolName: "createArtifact", curated: false })
    ).toBe("Create artifact")
  })

  it("keeps default runs on the raw platform prompt", () => {
    const systemPrompt = buildRunSystemPrompt({})

    expect(systemPrompt).toContain("You are Agentis")
    expect(systemPrompt).toContain("createArtifact")
    expect(systemPrompt).toContain("durable artifact")
    expect(systemPrompt).not.toContain("## Platform requirements")
  })

  it("keeps platform artifact instructions with explicit prompt sections", () => {
    const systemPrompt = buildRunSystemPrompt({
      agentPrompt: "Answer as the configured research agent.",
      projectContextBlock: "Workspace: Research",
    })

    expect(systemPrompt).toContain(
      "## Agent instructions\nAnswer as the configured research agent."
    )
    expect(systemPrompt).toContain("## Platform requirements")
    expect(systemPrompt).toContain("createArtifact")
    expect(systemPrompt).toContain("durable artifact")
    expect(systemPrompt).toContain("instead of asking for schema fields")
    expect(systemPrompt).toContain("## Project context\nWorkspace: Research")
    expect(systemPrompt.indexOf("## Agent instructions")).toBeLessThan(
      systemPrompt.indexOf("## Platform requirements")
    )
    expect(systemPrompt.indexOf("## Platform requirements")).toBeLessThan(
      systemPrompt.indexOf("## Project context")
    )
  })

  it("returns remediation when Slack is requested without grant", async () => {
    const { app, context } = createMockRuntimeApp((testContext) => {
      testContext.repos.integrationToolkits.seedFeatured()
    })

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
    expect(context.repos.runs.getById(run.id)?.status).toBe("failed")
    expect(
      context.repos.steps
        .listByRunId(run.id)
        .some(
          (step) =>
            step.title === "Integration required" ||
            step.payload?.remediation === "toolkit_not_connected"
        )
    ).toBe(true)
  })

  it("loads the bound agent configuration version when streaming a test-thread run", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const updated = context.repos.agents.update(agent.id, {
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

    expect(context.repos.runs.getById(run.id)).toMatchObject({
      status: "completed",
      model: "gpt-4.1-mini",
      agentConfigurationVersionId: updated.currentConfigurationVersion.id,
    })
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
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
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
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
    vi.spyOn(
      context.repos.agents,
      "getConfigurationVersionById"
    ).mockReturnValue(null)

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })

    expect(stream.status).toBe(404)
    const message = `Agent configuration version not found: ${run.agentConfigurationVersionId}`
    expect(context.repos.runs.getById(run.id)).toMatchObject({
      status: "failed",
      errorSummary: message,
    })
    expect(context.repos.threads.getById(thread.id)?.status).toBe("failed")
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
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
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const updated = context.repos.agents.update(agent.id, {
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

    expect(context.repos.steps.listByRunId(run.id)).toEqual(
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
