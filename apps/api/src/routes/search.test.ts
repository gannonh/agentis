import { afterEach, describe, expect, it } from "vitest"
import { MAX_SEARCH_QUERY_LENGTH } from "@workspace/shared"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("search routes", () => {
  it("returns grouped results for matching entities", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const project = ctx.repos.projects.create({
      name: "Prospect research",
      description: "Track outbound prospect notes",
    })
    const agent = ctx.repos.agents.create({
      name: "Prospect analyst",
      description: "Summarizes prospect research",
      systemPrompt: "You analyze prospects.",
      model: "gpt-4o-mini",
    })
    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Prospect follow-up thread",
      prompt: "Review the latest prospect notes.",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
    })
    ctx.repos.artifacts.create({
      title: "Prospect brief",
      type: "document",
      contentFormat: "markdown",
      mimeType: "text/markdown",
      sizeBytes: 120,
      storageKey: "artifacts/prospect-brief.md",
      visibilityScope: "global",
      previewText: "Key prospect talking points",
      projectId: project.id,
      threadId: thread.thread.id,
    })

    const response = await app.request("/api/search?q=prospect")
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      query: string
      threads: { id: string; title: string; entityType: string }[]
      artifacts: { id: string; title: string; entityType: string }[]
      agents: { id: string; title: string; entityType: string }[]
      projects: { id: string; title: string; entityType: string }[]
    }

    expect(body.query).toBe("prospect")
    expect(body.threads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: thread.thread.id,
          title: "Prospect follow-up thread",
          entityType: "thread",
        }),
      ])
    )
    expect(body.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Prospect brief",
          entityType: "artifact",
        }),
      ])
    )
    expect(body.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: agent.id,
          title: "Prospect analyst",
          entityType: "agent",
        }),
      ])
    )
    expect(body.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: project.id,
          title: "Prospect research",
          entityType: "project",
        }),
      ])
    )
  })

  it("returns empty groups for missing or blank query", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const missing = await app.request("/api/search")
    expect(missing.status).toBe(200)
    expect(await missing.json()).toEqual({
      query: "",
      threads: [],
      artifacts: [],
      agents: [],
      projects: [],
    })

    const blank = await app.request("/api/search?q=%20%20")
    expect(blank.status).toBe(200)
    expect(await blank.json()).toEqual({
      query: "",
      threads: [],
      artifacts: [],
      agents: [],
      projects: [],
    })
  })

  it("respects per-entity result limits", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    for (let index = 0; index < 10; index += 1) {
      ctx.repos.projects.create({
        name: `Prospect project ${index}`,
        description: "Shared prospect term",
      })
    }

    const response = await app.request("/api/search?q=prospect")
    expect(response.status).toBe(200)
    const body = (await response.json()) as { projects: unknown[] }
    expect(body.projects).toHaveLength(6)
  })

  it("treats LIKE wildcards in the query literally", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    ctx.repos.agents.create({
      name: "Alpha agent",
      description: "General purpose helper",
      systemPrompt: "You help with tasks.",
      model: "gpt-4o-mini",
    })
    ctx.repos.agents.create({
      name: "100% complete",
      description: "Tracks completion metrics",
      systemPrompt: "You track completion.",
      model: "gpt-4o-mini",
    })

    const response = await app.request("/api/search?q=%")
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      agents: { title: string }[]
    }
    expect(body.agents).toEqual([
      expect.objectContaining({ title: "100% complete" }),
    ])
  })

  it("rejects queries longer than the max length", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const longQuery = "a".repeat(MAX_SEARCH_QUERY_LENGTH + 1)
    const response = await app.request(
      `/api/search?q=${encodeURIComponent(longQuery)}`
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "Search query is too long.",
    })
  })
})
