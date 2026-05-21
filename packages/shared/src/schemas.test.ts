import { describe, expect, it } from "vitest"
import {
  createThreadRequestSchema,
  messageSchema,
  runSchema,
  threadDetailSchema,
  threadSchema,
} from "./schemas.js"

describe("shared schemas", () => {
  it("parses a thread detail payload", () => {
    const now = new Date().toISOString()
    const parsed = threadDetailSchema.parse({
      thread: {
        id: "thread-1",
        title: "Test",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: "msg-1",
          threadId: "thread-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
          status: "completed",
          createdAt: now,
        },
      ],
      runs: [
        {
          id: "run-1",
          threadId: "thread-1",
          status: "completed",
          model: "gpt-4o-mini",
          startedAt: now,
          finishedAt: now,
        },
      ],
      steps: [],
    })

    expect(parsed.thread.id).toBe("thread-1")
    expect(parsed.messages).toHaveLength(1)
  })

  it("rejects empty create thread prompts", () => {
    expect(() => createThreadRequestSchema.parse({ prompt: "" })).toThrow()
  })

  it("accepts minimal entities", () => {
    const now = new Date().toISOString()
    expect(
      threadSchema.parse({
        id: "t",
        title: "x",
        status: "active",
        model: "gpt-4o-mini",
        mode: "agent",
        createdAt: now,
        updatedAt: now,
      })
    ).toBeDefined()
    expect(
      messageSchema.parse({
        id: "m",
        threadId: "t",
        role: "assistant",
        parts: [{ type: "text", text: "hi" }],
        status: "streaming",
        createdAt: now,
      })
    ).toBeDefined()
    expect(
      runSchema.parse({
        id: "r",
        threadId: "t",
        status: "queued",
        model: "gpt-4o-mini",
        startedAt: now,
      })
    ).toBeDefined()
  })
})
