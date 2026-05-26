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

  it("persists editable draft fields and keeps source-derived grants", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
      toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
    })
    ctx.repos.threads.touch(created.thread.id, { status: "finished" })
    const app = createApp(ctx.repos, ctx.config)
    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const body = (await response.json()) as { draft: { id: string } }

    const updated = await app.request(`/api/agent-promotion-drafts/${body.draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Support Triage Agent",
        description: "Reviews and routes support backlog patterns.",
        systemPrompt: "Route support issues with clear severity labels.",
        model: "gpt-4.1-mini",
      }),
    })

    expect(updated.status).toBe(200)
    const updatedBody = (await updated.json()) as {
      draft: {
        name: string
        description: string
        systemPrompt: string
        model: string
        toolGrants: { toolkitSlug: string; connectionId?: string }[]
      }
    }
    expect(updatedBody.draft).toMatchObject({
      name: "Support Triage Agent",
      description: "Reviews and routes support backlog patterns.",
      systemPrompt: "Route support issues with clear severity labels.",
      model: "gpt-4.1-mini",
    })
    expect(updatedBody.draft.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])

    const read = await app.request(`/api/agent-promotion-drafts/${body.draft.id}`)
    const readBody = (await read.json()) as { draft: { name: string } }
    expect(readBody.draft.name).toBe("Support Triage Agent")
  })

  it("creates deterministic defaults for thin source threads", async () => {
    ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.threads.touch(thread.id, { status: "finished" })
    const app = createApp(ctx.repos, ctx.config)

    const first = await app.request(`/api/threads/${thread.id}/promotion-drafts`, {
      method: "POST",
    })
    const second = await app.request(`/api/threads/${thread.id}/promotion-drafts`, {
      method: "POST",
    })

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    const firstBody = (await first.json()) as {
      draft: { id: string; name: string; description: string; systemPrompt: string }
    }
    const secondBody = (await second.json()) as { draft: { id: string } }
    expect(secondBody.draft.id).toBe(firstBody.draft.id)
    expect(firstBody.draft).toMatchObject({
      name: "New Agent",
      description: "Promoted from a completed thread.",
      systemPrompt: "Use the approach from this completed thread.",
    })
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
