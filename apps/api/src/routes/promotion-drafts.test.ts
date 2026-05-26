import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("promotion draft routes", () => {
  it("creates and reads a draft from a finished source thread", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.threads.touch(created.thread.id, { status: "finished" })
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      draft: {
        id: string
        threadId: string
        sourceThreadTitle: string
        name: string
        systemPrompt: string
        model: string
      }
    }
    expect(body.draft).toMatchObject({
      threadId: created.thread.id,
      sourceThreadTitle: "Investigate support backlog",
      name: "Investigate support backlog Agent",
      model: "gpt-4o-mini",
    })
    expect(body.draft.systemPrompt).toContain("Review support backlog patterns")

    const read = await app.request(`/api/agent-promotion-drafts/${body.draft.id}`)

    expect(read.status).toBe(200)
    const readBody = (await read.json()) as { draft: { id: string } }
    expect(readBody.draft.id).toBe(body.draft.id)
  })

  it("rejects promotion for missing and unfinished source threads", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Active work",
      prompt: "Keep researching",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)

    const missing = await app.request("/api/threads/missing/promotion-drafts", {
      method: "POST",
    })
    expect(missing.status).toBe(404)
    expect((await missing.json()) as { code: string }).toMatchObject({
      code: "thread_not_found",
    })

    const active = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    expect(active.status).toBe(400)
    expect((await active.json()) as { code: string }).toMatchObject({
      code: "thread_not_promotable",
    })
  })
})
