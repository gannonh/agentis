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

    ctx.cleanup()
  })
})
