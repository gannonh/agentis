import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { loadThreadListContext } from "./thread-list-context.js"

describe("loadThreadListContext", () => {
  it("builds list context from batched repository reads", () => {
    const ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "Launch readiness",
      model: "gpt-4o-mini",
      mode: "agent",
    })

    ctx.repos.messages.create({
      threadId: thread.id,
      role: "user",
      parts: [{ type: "text", text: "Prepare a launch readiness update." }],
    })
    ctx.repos.messages.create({
      threadId: thread.id,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Launch readiness is on track with two blockers to resolve.",
        },
      ],
    })

    const context = loadThreadListContext(ctx.repos, [thread.id]).get(thread.id)

    expect(context?.messageCount).toBe(2)
    expect(context?.summary).toBe(
      "Launch readiness is on track with two blockers to resolve."
    )
    expect(context?.documentCount).toBe(0)
    expect(context?.hasPendingApproval).toBe(false)

    ctx.cleanup()
  })

  it("derives hasPendingApproval from latest run steps", () => {
    const ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "Plan mode approval",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: "gpt-4o-mini",
      status: "running",
    })
    ctx.repos.steps.create({
      runId: run.id,
      type: "tool-result",
      status: "pending",
      title: "Workspace edit",
      payload: {
        toolCallId: "tool-call-1",
        approval: { status: "pending" },
      },
    })

    const context = loadThreadListContext(ctx.repos, [thread.id]).get(thread.id)

    expect(context?.hasPendingApproval).toBe(true)

    ctx.cleanup()
  })

  it("returns false when latest run has no pending approval", () => {
    const ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "Completed thread",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: "gpt-4o-mini",
      status: "completed",
    })
    ctx.repos.steps.create({
      runId: run.id,
      type: "tool-result",
      status: "completed",
      title: "Workspace edit",
      payload: {
        toolCallId: "tool-call-1",
        approval: { status: "approved" },
      },
    })

    const context = loadThreadListContext(ctx.repos, [thread.id]).get(thread.id)

    expect(context?.hasPendingApproval).toBe(false)

    ctx.cleanup()
  })
})
