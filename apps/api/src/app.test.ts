import type { RuntimeHealth } from "@workspace/shared"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createApp } from "./app.js"
import { createTestContext, type TestContext } from "./test/setup.js"
import { isRuntimeAvailable, loadConfig } from "./config.js"
import { savedMemories } from "./db/schema.js"
import {
  GENERIC_AGENTIS_AGENT_ID,
  GENERIC_AGENTIS_WORKSPACE_ID,
} from "./workspaces/constants.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("api routes", () => {
  it("reports missing selected Gateway runtime credentials", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      aiGatewayProvider: "cloudflare",
      aiGatewayApiKey: undefined,
      vercelAiGatewayApiKey: undefined,
      cloudflareApiKey: "cloudflare-key",
      cloudflareAccountId: undefined,
      mockRuntime: false,
    })

    const response = await app.request("/api/runtime/health")
    const body = (await response.json()) as RuntimeHealth

    expect(body.available).toBe(false)
    expect(body.reason).toBe("missing_api_key")
    expect(body.model).toBe("openai/gpt-5.4-mini")
    expect(body.defaultModel).toBe("openai/gpt-5.4-mini")
    expect(body.aiGatewayProvider).toBe("cloudflare")
    expect(body.missingEnvVars).toEqual(["CLOUDFLARE_ACCOUNT_ID"])
    expect(body.models?.some((m) => m.id === "@cf/moonshotai/kimi-k2.6")).toBe(
      true
    )
    expect(body.models?.some((m) => m.id === "anthropic/claude-sonnet-4.6")).toBe(
      true
    )
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
      thread: { id: string; agentId?: string; workspaceId?: string }
      message: { role: string }
      run: { status: string; agentId?: string }
    }
    expect(body.thread).toMatchObject({
      agentId: GENERIC_AGENTIS_AGENT_ID,
      agentNameSnapshot: "Agentis",
      workspaceId: GENERIC_AGENTIS_WORKSPACE_ID,
    })
    expect(body.message.role).toBe("user")
    expect(body.run).toMatchObject({
      status: "queued",
      agentId: GENERIC_AGENTIS_AGENT_ID,
    })
  })

  it("applies a follow-up model override to the queued run and thread", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Summarize workspace status",
        model: "openai/gpt-5.4-mini",
      }),
    })
    const { thread } = (await created.json()) as { thread: { id: string } }

    const followUp = await app.request(`/api/threads/${thread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Continue with more detail",
        model: "anthropic/claude-sonnet-4.6",
      }),
    })

    expect(followUp.status).toBe(201)
    const body = (await followUp.json()) as {
      run: { model: string }
    }
    expect(body.run.model).toBe("anthropic/claude-sonnet-4.6")

    const detail = await app.request(`/api/threads/${thread.id}`)
    const detailBody = (await detail.json()) as {
      thread: { model: string }
    }
    expect(detailBody.thread.model).toBe("anthropic/claude-sonnet-4.6")
  })

  it("clamps provider-incompatible follow-up models to the catalog default", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, {
      ...ctx.config,
      aiGatewayProvider: "vercel",
    })

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize workspace status" }),
    })
    const { thread } = (await created.json()) as { thread: { id: string } }

    const followUp = await app.request(`/api/threads/${thread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Continue with more detail",
        model: "@cf/moonshotai/kimi-k2.6",
      }),
    })

    expect(followUp.status).toBe(201)
    const body = (await followUp.json()) as {
      run: { model: string }
    }
    expect(body.run.model).toBe("openai/gpt-5.4-mini")
  })

  it("creates a selected-agent thread with the agent workspace", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const workspace = ctx.repos.workspaces.getDefaultByAgentId(agent.id)
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Summarize workspace status",
        agentId: agent.id,
      }),
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      thread: { agentId?: string; workspaceId?: string }
      run: { agentId?: string }
    }
    expect(body.thread).toMatchObject({
      agentId: agent.id,
      workspaceId: workspace?.id,
    })
    expect(body.run.agentId).toBe(agent.id)
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
      source: "user-generated",
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

  it("updates memory scope to multiple agents without changing source thread provenance", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)
    const firstAgent = ctx.repos.agents.create({
      name: "Memory Agent",
      systemPrompt: "Use scoped memories.",
      model: "gpt-4o-mini",
    })
    const secondAgent = ctx.repos.agents.create({
      name: "Support Agent",
      systemPrompt: "Use shared scoped memories.",
      model: "gpt-4o-mini",
    })
    const memory = ctx.repos.savedMemories.create({
      content: "Use concise updates.",
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use for updates.",
      tags: ["updates"],
      scope: "global",
      pinnedToContext: false,
    })

    const response = await app.request(`/api/memories/${memory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "agent",
        associatedAgents: [firstAgent.id, secondAgent.id],
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      scope: string
      associatedAgent: string
      associatedAgents: string[]
      source: string
      provenance: string
    }
    expect(body).toMatchObject({
      scope: "agent",
      associatedAgent: firstAgent.id,
      associatedAgents: [firstAgent.id, secondAgent.id],
      source: "user-generated",
      provenance: "created manually by user",
    })
  })

  it("returns 404 when a saved memory disappears during update", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)
    const memory = ctx.repos.savedMemories.create({
      content: "Use concise updates.",
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use for updates.",
      tags: ["updates"],
      scope: "global",
      pinnedToContext: false,
    })
    vi.spyOn(ctx.repos.savedMemories, "update").mockReturnValue(null)

    const response = await app.request(`/api/memories/${memory.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Updated content." }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: "Memory not found",
      code: "memory_not_found",
    })
  })

  it("returns saved memories when stored tags JSON is malformed", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, ctx.config)

    ctx.db
      .insert(savedMemories)
      .values({
        id: "memory_bad_tags",
        content: "Memory with bad tags",
        category: "memory_category_project_context",
        usageGuidance: "Use to verify malformed tags do not break listing.",
        tagsJson: "not-json",
        importance: "medium",
        date: "2026-05-27",
        scope: "global",
        associatedAgent: null,
        source: "user-generated",
        sourceThreadId: null,
        sourceThreadTitle: null,
        provenance: "test malformed tags row",
        createdAt: "2026-05-27T00:00:00.000Z",
        updatedAt: "2026-05-27T00:00:00.000Z",
      })
      .run()

    const response = await app.request("/api/memories")

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      memories: { id: string; tags: string[] }[]
    }
    expect(
      body.memories.find((memory) => memory.id === "memory_bad_tags")?.tags
    ).toEqual([])
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

  it("detects runtime availability from the selected Gateway provider or mock mode", () => {
    expect(
      isRuntimeAvailable(
        loadConfig({
          AI_GATEWAY_PROVIDER: "vercel",
          VERCEL_AI_GATEWAY_API_KEY: "x",
        })
      )
    ).toBe(true)
    expect(isRuntimeAvailable(loadConfig({ AGENTIS_MOCK_RUNTIME: "1" }))).toBe(
      true
    )
    expect(isRuntimeAvailable(loadConfig({}))).toBe(false)
  })
})
