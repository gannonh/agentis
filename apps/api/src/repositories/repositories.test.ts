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
})
