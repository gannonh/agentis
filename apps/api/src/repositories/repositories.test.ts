import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"

describe("repositories", () => {
  it("creates thread, message, run, and steps", () => {
    const ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "Test thread",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const message = ctx.repos.messages.create({
      threadId: thread.id,
      role: "user",
      parts: [{ type: "text", text: "Hello" }],
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: thread.model,
      status: "queued",
    })
    const step = ctx.repos.steps.create({
      runId: run.id,
      type: "queued",
      status: "pending",
      title: "Queued",
    })

    expect(ctx.repos.threads.getById(thread.id)?.title).toBe("Test thread")
    expect(ctx.repos.messages.listByThreadId(thread.id)).toHaveLength(1)
    expect(ctx.repos.runs.getById(run.id)?.status).toBe("queued")
    expect(ctx.repos.steps.listByRunId(run.id)).toHaveLength(1)
    expect(step.title).toBe("Queued")
    expect(message.parts[0]?.type).toBe("text")

    ctx.cleanup()
  })

  it("updates assistant message parts for streaming", () => {
    const ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "Stream",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const assistant = ctx.repos.messages.create({
      threadId: thread.id,
      role: "assistant",
      parts: [{ type: "text", text: "" }],
      status: "streaming",
    })

    const updated = ctx.repos.messages.updatePartsAndStatus(
      assistant.id,
      [{ type: "text", text: "Partial" }],
      "aborted"
    )

    expect(updated?.parts[0]).toEqual({ type: "text", text: "Partial" })
    expect(updated?.status).toBe("aborted")
    ctx.cleanup()
  })

  it("transitions run status with finished timestamp", () => {
    const ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "Run",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: thread.model,
    })

    const completed = ctx.repos.runs.updateStatus(run.id, "completed", {
      finishedAt: new Date().toISOString(),
      usage: { totalTokens: 12 },
    })

    expect(completed?.status).toBe("completed")
    expect(completed?.usage?.totalTokens).toBe(12)
    ctx.cleanup()
  })

  it("creates configuration versions for tool-grant snapshots", () => {
    const ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const slack = ctx.repos.integrationConnections.create({
      toolkitSlug: "slack",
      status: "connected",
      composioConnectedAccountId: "acct-slack",
    })
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )

    const updated = ctx.repos.agents.update(agent.id, {
      toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
    })!

    expect(updated.currentConfigurationVersion.version).toBe(2)
    expect(updated.currentConfigurationVersion.toolGrants).toEqual([
      { toolkitSlug: "slack", connectionId: slack.id },
    ])
    expect(ctx.repos.agents.listConfigurationVersions(agent.id)).toMatchObject([
      {
        version: 1,
        toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
      },
      {
        version: 2,
        toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
      },
    ])
    ctx.cleanup()
  })

  it("persists agent-bound thread metadata and run configuration version links", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4.1-mini",
    })
    const versionId = agent.currentConfigurationVersion.id

    const thread = ctx.repos.threads.create({
      title: "Test Research Agent",
      model: agent.model,
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: agent.model,
      status: "queued",
      agentId: agent.id,
      agentConfigurationVersionId: versionId,
    })

    expect(ctx.repos.threads.getById(thread.id)).toMatchObject({
      agentId: agent.id,
      agentNameSnapshot: "Research Agent",
    })
    expect(ctx.repos.runs.getById(run.id)).toMatchObject({
      agentId: agent.id,
      agentConfigurationVersionId: versionId,
    })
    expect(ctx.repos.runs.listByThreadId(thread.id)[0]).toMatchObject({
      agentId: agent.id,
      agentConfigurationVersionId: versionId,
    })

    const plainThread = ctx.repos.threads.create({
      title: "Plain",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const plainRun = ctx.repos.runs.create({
      threadId: plainThread.id,
      model: plainThread.model,
    })
    expect(ctx.repos.threads.getById(plainThread.id)?.agentId).toBeUndefined()
    expect(
      ctx.repos.runs.getById(plainRun.id)?.agentConfigurationVersionId
    ).toBeUndefined()
    ctx.cleanup()
  })
})
