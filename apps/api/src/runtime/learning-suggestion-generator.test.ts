import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createMockRuntimeApp() {
  ctx = createTestContext()
  ctx.config.mockRuntime = true
  return { app: createApp(ctx.repos, ctx.config), context: ctx }
}

describe("learning suggestion generator", () => {
  it("creates a pending suggestion after a completed mock-runtime thread", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Remember that I prefer concise summaries.",
      }),
    })
    expect(created.status).toBe(201)
    const { run, thread } = (await created.json()) as {
      run: { id: string }
      thread: { id: string }
    }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const suggestions = context.repos.learningSuggestions.listPaginated({
      page: 1,
      pageSize: 10,
      threadId: thread.id,
    })
    expect(suggestions.totalCount).toBe(1)
    expect(suggestions.suggestions[0]).toMatchObject({
      status: "pending",
      suggestionType: "memory",
      sourceThreadId: thread.id,
    })
  }, 10_000)
})
