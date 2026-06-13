import { describe, expect, it } from "vitest"
import { messages, runs, toolAccessGrants } from "../db/schema.js"
import { createTestContext } from "../test/setup.js"
import {
  GENERIC_AGENTIS_AGENT_ID,
  GENERIC_AGENTIS_WORKSPACE_ID,
} from "../workspaces/constants.js"

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

  it("groups messages by thread id for batch reads", () => {
    const ctx = createTestContext()
    const firstThread = ctx.repos.threads.create({
      title: "First",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const secondThread = ctx.repos.threads.create({
      title: "Second",
      model: "gpt-4o-mini",
      mode: "plan",
    })

    ctx.repos.messages.create({
      threadId: firstThread.id,
      role: "user",
      parts: [{ type: "text", text: "First prompt" }],
    })
    ctx.repos.messages.create({
      threadId: secondThread.id,
      role: "user",
      parts: [{ type: "text", text: "Second prompt" }],
    })

    const grouped = ctx.repos.messages.listByThreadIds([
      firstThread.id,
      secondThread.id,
    ])

    expect(grouped.get(firstThread.id)).toHaveLength(1)
    expect(grouped.get(secondThread.id)).toHaveLength(1)

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

  it("returns only the latest run for each requested thread", async () => {
    const ctx = createTestContext()
    const firstThread = ctx.repos.threads.create({
      title: "First run group",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const secondThread = ctx.repos.threads.create({
      title: "Second run group",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const firstOld = ctx.repos.runs.create({
      threadId: firstThread.id,
      model: firstThread.model,
      status: "completed",
    })
    await new Promise((resolve) => setTimeout(resolve, 2))
    const firstLatest = ctx.repos.runs.create({
      threadId: firstThread.id,
      model: firstThread.model,
      status: "running",
    })
    const secondLatest = ctx.repos.runs.create({
      threadId: secondThread.id,
      model: secondThread.model,
      status: "queued",
    })

    const latestRuns = ctx.repos.runs.listLatestByThreadIds([
      firstThread.id,
      secondThread.id,
      "missing-thread",
    ])

    expect([...latestRuns.keys()].sort()).toEqual(
      [firstThread.id, secondThread.id].sort()
    )
    expect(latestRuns.get(firstThread.id)?.id).toBe(firstLatest.id)
    expect(latestRuns.get(secondThread.id)?.id).toBe(secondLatest.id)
    expect(latestRuns.get(firstThread.id)?.id).not.toBe(firstOld.id)
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
    expect(ctx.repos.threads.getById(plainThread.id)).toMatchObject({
      agentId: GENERIC_AGENTIS_AGENT_ID,
      agentNameSnapshot: "Agentis",
      workspaceId: GENERIC_AGENTIS_WORKSPACE_ID,
    })
    expect(
      ctx.repos.runs.getById(plainRun.id)?.agentConfigurationVersionId
    ).toBeUndefined()
    ctx.cleanup()
  })

  it("lists agent activity and library data in stable API order", async () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const otherAgent = ctx.repos.agents.create({
      name: "Other Agent",
      systemPrompt: "Answer briefly.",
      model: "gpt-4o-mini",
    })
    const older = ctx.repos.threads.createWithInitialRun({
      title: "Older activity",
      prompt: "First check",
      model: agent.model,
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    }).thread
    await new Promise((resolve) => setTimeout(resolve, 2))
    const newer = ctx.repos.threads.createWithInitialRun({
      title: "Newer activity",
      prompt: "Second check",
      model: agent.model,
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    }).thread
    ctx.repos.threads.createWithInitialRun({
      title: "Other activity",
      prompt: "Other check",
      model: otherAgent.model,
      mode: "agent",
      agentId: otherAgent.id,
      agentNameSnapshot: otherAgent.name,
      agentConfigurationVersionId: otherAgent.currentConfigurationVersion.id,
    })
    ctx.repos.documents.create({
      title: "Agent notes",
      documentType: "document",
      mimeType: "text/markdown",
      sizeBytes: 12,
      storageKey: "agent-notes.md",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      threadId: newer.id,
      threadTitleSnapshot: newer.title,
    })
    ctx.repos.documents.create({
      title: "Other notes",
      documentType: "document",
      mimeType: "text/markdown",
      sizeBytes: 12,
      storageKey: "other-notes.md",
      agentId: otherAgent.id,
      agentNameSnapshot: otherAgent.name,
    })

    expect(
      ctx.repos.threads.listByAgentId(agent.id).map((thread) => thread.id)
    ).toEqual([newer.id, older.id])
    expect(ctx.repos.threads.listByAgentId("missing-agent")).toEqual([])
    expect(ctx.repos.documents.list({ agentId: agent.id })).toMatchObject([
      { title: "Agent notes", agentId: agent.id },
    ])
    expect(ctx.repos.documents.list({ agentId: "missing-agent" })).toEqual([])
    ctx.cleanup()
  })

  it("rolls back initial thread creation when grant insertion fails", () => {
    const ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })

    expect(() =>
      ctx.repos.threads.createWithInitialRun({
        title: "Test Research Agent",
        prompt: "Check GitHub updates",
        model: "gpt-4o-mini",
        mode: "agent",
        toolGrants: [
          { toolkitSlug: "github", connectionId: github.id },
          { toolkitSlug: "github", connectionId: github.id },
        ],
      })
    ).toThrow()

    expect(ctx.repos.threads.list()).toHaveLength(0)
    expect(ctx.db.select().from(messages).all()).toHaveLength(0)
    expect(ctx.db.select().from(runs).all()).toHaveLength(0)
    expect(ctx.db.select().from(toolAccessGrants).all()).toHaveLength(0)
    ctx.cleanup()
  })
})
