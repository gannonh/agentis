import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "./app.js"
import { createTestContext, type TestContext } from "./test/setup.js"
import { isRuntimeAvailable, loadConfig } from "./config.js"

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

  it("streams an edited agent test thread with version metadata and preserves plain threads", async () => {
    ctx = createTestContext()
    const app = createApp(ctx.repos, { ...ctx.config, mockRuntime: true })

    const createdAgent = await app.request("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      }),
    })
    const createdAgentBody = (await createdAgent.json()) as {
      agent: { id: string }
    }

    const editedAgent = await app.request(
      `/api/agents/${createdAgentBody.agent.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "Answer with citations and source quality notes.",
          model: "gpt-4.1-mini",
        }),
      }
    )
    const editedAgentBody = (await editedAgent.json()) as {
      agent: {
        id: string
        currentConfigurationVersion: { id: string; version: number }
      }
    }

    const launched = await app.request(
      `/api/agents/${editedAgentBody.agent.id}/test-thread`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Summarize workspace status" }),
      }
    )
    const launchedBody = (await launched.json()) as {
      thread: { id: string; agentId?: string; agentNameSnapshot?: string }
      run: { id: string; agentConfigurationVersionId?: string; model: string }
    }

    const stream = await app.request(`/api/runs/${launchedBody.run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const detail = await app.request(`/api/threads/${launchedBody.thread.id}`)
    const detailBody = (await detail.json()) as {
      thread: { agentId?: string; agentNameSnapshot?: string }
      runs: { status: string; agentConfigurationVersionId?: string; model: string }[]
      steps: { title: string; payload?: Record<string, unknown> }[]
    }
    expect(detailBody.thread).toMatchObject({
      agentId: editedAgentBody.agent.id,
      agentNameSnapshot: "Research Agent",
    })
    expect(detailBody.runs[0]).toMatchObject({
      status: "completed",
      agentConfigurationVersionId:
        editedAgentBody.agent.currentConfigurationVersion.id,
      model: "gpt-4.1-mini",
    })
    expect(detailBody.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Agent configuration loaded",
          payload: expect.objectContaining({
            agentId: editedAgentBody.agent.id,
            agentConfigurationVersionId:
              editedAgentBody.agent.currentConfigurationVersion.id,
          }),
        }),
      ])
    )

    const plain = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello from a normal thread" }),
    })
    const plainBody = (await plain.json()) as {
      thread: { agentId?: string }
      run: { agentConfigurationVersionId?: string }
    }
    expect(plain.status).toBe(201)
    expect(plainBody.thread.agentId).toBeUndefined()
    expect(plainBody.run.agentConfigurationVersionId).toBeUndefined()
  }, 10_000)

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
