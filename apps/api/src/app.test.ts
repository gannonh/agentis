import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "./app.js"
import { createTestContext, type TestContext } from "./test/setup.js"
import { isRuntimeAvailable, loadConfig } from "./config.js"
import { savedMemories } from "./db/schema.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("api routes", () => {
  it("reports missing runtime key", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      openAiApiKey: undefined,
    })

    const response = await app.request("/api/runtime/health")
    const body = (await response.json()) as {
      available: boolean
      reason?: string
    }

    expect(body.available).toBe(false)
    expect(body.reason).toBe("missing_api_key")
  })

  it("creates a thread with queued run", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize workspace status" }),
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      thread: { id: string }
      message: { role: string }
      run: { status: string }
    }
    expect(body.thread.id).toBeTruthy()
    expect(body.message.role).toBe("user")
    expect(body.run.status).toBe("queued")
  })

  it("allows a configured web origin with a trailing slash", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      webAppOrigin: "http://127.0.0.1:5177/",
    })

    const response = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://127.0.0.1:5177",
        "Access-Control-Request-Method": "GET",
      },
    })

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:5177"
    )
  })

  it("allows the configured web origin for browser requests", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      webAppOrigin: "http://127.0.0.1:5177",
    })

    const response = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5177",
        "Access-Control-Request-Method": "GET",
      },
    })

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5177"
    )
  })

  it("returns seeded saved memories with category metadata", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request("/api/memories")

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      categories: { name: string; count: number }[]
      memories: {
        content: string
        category: string
        usageGuidance: string
        tags: string[]
        importance: string
        date: string
        scope: string
        associatedAgent?: string | null
        source: string
        provenance: string
      }[]
    }

    expect(body.categories.map((category) => category.name)).toEqual([
      "User Fact",
      "Preference",
      "Project Context",
      "Domain Knowledge",
      "People",
      "Active Work",
      "Tools & Workflows",
      "Organization",
    ])
    expect(body.categories.some((category) => category.count === 0)).toBe(true)
    expect(body.memories.length).toBeGreaterThan(0)
    expect(body.memories[0]).toMatchObject({
      category: "memory_category_project_context",
      usageGuidance: expect.any(String),
      tags: expect.any(Array),
      importance: expect.stringMatching(/^(low|medium|high)$/),
      source: "seeded",
      provenance: expect.stringContaining("mocked"),
    })
  })

  it("rejects agent-scoped saved memories for unknown agents", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Use account context for escalation drafts.",
        category: "memory_category_preference",
        importance: "high",
        scope: "agent",
        associatedAgent: "agent_missing",
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "Agent not found",
      code: "agent_not_found",
    })
  })

  it("creates user-generated saved memories and returns them from the database", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "User prefers TypeScript over JavaScript.",
        category: "memory_category_preference",
        importance: "high",
        usageGuidance: "Use when choosing implementation language.",
        tags: ["typescript", "preference"],
        scope: "global",
        pinnedToContext: true,
      }),
    })

    expect(response.status).toBe(201)
    const created = (await response.json()) as {
      id: string
      source: string
      provenance: string
      pinnedToContext: boolean
    }
    expect(created.source).toBe("user-generated")
    expect(created.provenance).toBe("created manually by user")
    expect(created.pinnedToContext).toBe(true)

    const listResponse = await app.request("/api/memories")
    const body = (await listResponse.json()) as {
      categories: { name: string; count: number }[]
      memories: { id: string; content: string; pinnedToContext: boolean }[]
    }

    expect(
      body.memories.find((memory) => memory.id === created.id)
    ).toMatchObject({
      content: "User prefers TypeScript over JavaScript.",
      pinnedToContext: true,
    })
    expect(
      body.categories.find((category) => category.name === "Preference")?.count
    ).toBeGreaterThanOrEqual(1)
  })

  it("returns saved memories when stored tags JSON is malformed", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    ctx.db.insert(savedMemories).values({
      id: "memory_bad_tags",
      content: "Memory with bad tags",
      category: "memory_category_project_context",
      usageGuidance: "Use to verify malformed tags do not break listing.",
      tagsJson: "not-json",
      importance: "medium",
      date: "2026-05-27",
      scope: "global",
      associatedAgent: null,
      source: "seeded",
      provenance: "test malformed tags row",
      createdAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
    }).run()

    const response = await app.request("/api/memories")

    expect(response.status).toBe(200)
    const body = (await response.json()) as { memories: { id: string; tags: string[] }[] }
    expect(body.memories.find((memory) => memory.id === "memory_bad_tags")?.tags).toEqual([])
  })

  it("returns thread detail for resume", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello" }),
    })
    const { thread } = (await created.json()) as { thread: { id: string } }

    const detail = await app.request(`/api/threads/${thread.id}`)
    const body = (await detail.json()) as {
      messages: unknown[]
      runs: unknown[]
    }

    expect(body.messages).toHaveLength(1)
    expect(body.runs).toHaveLength(1)
  })

  it("marks run aborted via abort endpoint", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const thread = ctx.repos.threads.create({
      title: "Abort",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: thread.model,
      status: "running",
    })
    ctx.repos.messages.create({
      threadId: thread.id,
      role: "assistant",
      parts: [{ type: "text", text: "Partial answer" }],
      status: "streaming",
    })

    const response = await app.request(`/api/runs/${run.id}/abort`, {
      method: "POST",
    })
    const body = (await response.json()) as { run: { status: string } }

    expect(response.status).toBe(200)
    expect(body.run.status).toBe("aborted")
  })
})

describe("config", () => {
  it("uses Agentis-specific dev ports before generic PORT", () => {
    const config = loadConfig({
      AGENTIS_API_PORT: "3101",
      PORT: "3001",
      AGENTIS_WEB_ORIGIN: "http://127.0.0.1:5177",
    })

    expect(config.port).toBe(3101)
    expect(config.webAppOrigin).toBe("http://127.0.0.1:5177")
  })

  it("defaults to the reserved Agentis dev ports", () => {
    const config = loadConfig({})

    expect(config.port).toBe(3101)
    expect(config.webAppOrigin).toBe("http://127.0.0.1:5177")
  })

  it("detects runtime availability from api key or mock mode", () => {
    expect(
      isRuntimeAvailable({ openAiApiKey: "x", mockRuntime: false } as never)
    ).toBe(true)
    expect(
      isRuntimeAvailable({
        openAiApiKey: undefined,
        mockRuntime: true,
      } as never)
    ).toBe(true)
    expect(
      isRuntimeAvailable({
        openAiApiKey: undefined,
        mockRuntime: false,
      } as never)
    ).toBe(false)
  })
})
