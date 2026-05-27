import { afterEach, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { createApp } from "../app.js"
import { agentPromotionDrafts } from "../db/schema.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("promotion draft routes", () => {
  it("creates and reads a draft from an active source thread", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
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

    const read = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`
    )

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
    const app = createApp(ctx.repos, ctx.config)
    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const body = (await response.json()) as { draft: { id: string } }
    const draftRow = ctx.db
      .select({ toolGrantsJson: agentPromotionDrafts.toolGrantsJson })
      .from(agentPromotionDrafts)
      .where(eq(agentPromotionDrafts.id, body.draft.id))
      .get()
    expect(JSON.parse(draftRow?.toolGrantsJson ?? "[]")).toEqual([
      { toolkitSlug: "github", connectionId: github.id },
    ])

    const updated = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Reviews and routes support backlog patterns.",
          systemPrompt: "Route support issues with clear severity labels.",
          model: "gpt-4.1-mini",
        }),
      }
    )

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

    const read = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`
    )
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
    const app = createApp(ctx.repos, ctx.config)

    const first = await app.request(
      `/api/threads/${thread.id}/promotion-drafts`,
      {
        method: "POST",
      }
    )
    const second = await app.request(
      `/api/threads/${thread.id}/promotion-drafts`,
      {
        method: "POST",
      }
    )

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    const firstBody = (await first.json()) as {
      draft: {
        id: string
        name: string
        description: string
        systemPrompt: string
      }
    }
    const secondBody = (await second.json()) as { draft: { id: string } }
    expect(secondBody.draft.id).toBe(firstBody.draft.id)
    expect(firstBody.draft).toMatchObject({
      name: "New Agent",
      description: "Created from a thread.",
      systemPrompt: "Use the context from this thread.",
    })
  })

  it("creates an agent from draft edits in a single promotion command", async () => {
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
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as {
      draft: {
        id: string
        name: string
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
    }
    expect(draft.sourceWorkflow).toMatchObject({
      summary: "Investigate support backlog",
      firstUserPrompt: "Review support backlog patterns",
    })

    ctx.repos.threads.touch(created.thread.id, {
      title: "Renamed support backlog source",
    })

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Routes support backlog patterns.",
          systemPrompt: "Assign severity and next steps.",
          model: "gpt-4.1-mini",
          toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
        }),
      }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      agent: {
        id: string
        name: string
        description?: string
        systemPrompt: string
        model: string
        toolGrantCount: number
        sourceThread?: { id: string; title: string }
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
      toolGrants: { toolkitSlug: string; connectionId?: string }[]
    }
    expect(body.agent).toMatchObject({
      name: "Support Triage Agent",
      description: "Routes support backlog patterns.",
      systemPrompt: "Assign severity and next steps.",
      model: "gpt-4.1-mini",
      toolGrantCount: 1,
      sourceThread: {
        id: created.thread.id,
        title: "Investigate support backlog",
      },
      sourceWorkflow: {
        summary: "Investigate support backlog",
        firstUserPrompt: "Review support backlog patterns",
      },
    })
    expect(body.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])
    const reloaded = await app.request(`/api/agents/${body.agent.id}`)
    expect(reloaded.status).toBe(200)
    const reloadedBody = (await reloaded.json()) as {
      agent: {
        sourceThread?: { id: string; title: string }
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
    }
    expect(reloadedBody.agent.sourceThread).toMatchObject({
      id: created.thread.id,
      title: "Investigate support backlog",
    })
    expect(reloadedBody.agent.sourceWorkflow).toMatchObject({
      summary: "Investigate support backlog",
      firstUserPrompt: "Review support backlog patterns",
    })
    expect(ctx.repos.agentPromotionDrafts.getById(draft.id)?.name).toBe(
      "Investigate support backlog Agent"
    )
  })

  it("rejects draft creation for missing and agent-owned source threads", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Support Triage Agent",
      systemPrompt: "Handle support triage.",
      model: "gpt-4o-mini",
    })
    const agentThread = ctx.repos.threads.createWithInitialRun({
      title: "Test Support Triage Agent",
      prompt: "Test this agent",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const app = createApp(ctx.repos, ctx.config)

    const missing = await app.request("/api/threads/missing/promotion-drafts", {
      method: "POST",
    })
    const agentOwned = await app.request(
      `/api/threads/${agentThread.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(missing.status).toBe(404)
    expect((await missing.json()) as { code: string }).toMatchObject({
      code: "thread_not_found",
    })
    expect(agentOwned.status).toBe(400)
    expect((await agentOwned.json()) as { code: string }).toMatchObject({
      code: "thread_already_has_agent",
    })
  })
})
