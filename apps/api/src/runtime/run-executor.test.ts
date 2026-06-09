import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createComposioServices } from "../composio/index.js"
import { createApp } from "../app.js"
import { MOCK_MODEL_COST_USD } from "../cost/run-cost-attribution.js"
import { runs, threads } from "../db/schema.js"
import { WebSearchService } from "../research/web-search-service.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import {
  buildRunSystemPrompt,
  formatToolStepTitle,
  suppressTextForPendingApproval,
} from "./run-executor.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createMockRuntimeApp(setup?: (context: TestContext) => void) {
  ctx = createTestContext()
  setup?.(ctx)
  const services = createComposioServices(ctx.repos, ctx.config)
  return {
    app: createApp(
      ctx.repos,
      { ...ctx.config, mockRuntime: true, nodeEnv: "development" },
      services
    ),
    context: ctx,
  }
}

function messageText(parts: Array<{ type: string; text?: string }>) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
}

describe("run executor composio bridge", () => {
  it("keeps native workspace tool titles when finalizing tool calls", () => {
    expect(
      formatToolStepTitle({ toolName: "createDocument", curated: false })
    ).toBe("Create document")
    expect(
      formatToolStepTitle({ toolName: "listWorkspaceFiles", curated: false })
    ).toBe("Native: listWorkspaceFiles")
  })

  it("keeps default runs on the raw platform prompt", () => {
    const systemPrompt = buildRunSystemPrompt({})

    expect(systemPrompt).toContain("You are Agentis")
    expect(systemPrompt).not.toContain("createDocument")
    expect(systemPrompt).not.toContain("## Platform requirements")
  })

  it("keeps platform requirements separate from document capability guidance", () => {
    const systemPrompt = buildRunSystemPrompt({
      agentPrompt: "Answer as the configured research agent.",
      contextSections: [
        { title: "Project context", body: "Workspace: Research" },
      ],
    })

    expect(systemPrompt).toContain(
      "## Agent instructions\nAnswer as the configured research agent."
    )
    expect(systemPrompt).toContain("## Platform requirements")
    expect(systemPrompt).not.toContain("createDocument")
    expect(systemPrompt).toContain("## Project context\nWorkspace: Research")
    expect(systemPrompt.indexOf("## Agent instructions")).toBeLessThan(
      systemPrompt.indexOf("## Platform requirements")
    )
    expect(systemPrompt.indexOf("## Platform requirements")).toBeLessThan(
      systemPrompt.indexOf("## Project context")
    )
  })

  it("returns remediation when Slack is requested without grant", async () => {
    const { app, context } = createMockRuntimeApp((testContext) => {
      testContext.repos.integrationToolkits.seedFeatured()
    })

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Post this update to Slack" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(400)
    expect(context.repos.runs.getById(run.id)?.status).toBe("failed")
    expect(
      context.repos.steps
        .listByRunId(run.id)
        .some(
          (step) =>
            step.title === "Integration required" ||
            step.payload?.remediation === "toolkit_not_connected"
        )
    ).toBe(true)
  })

  it("returns remediation when GitHub is connected but not granted", async () => {
    const { app, context } = createMockRuntimeApp((testContext) => {
      testContext.repos.integrationToolkits.seedFeatured()
      testContext.repos.integrationConnections.create({
        toolkitSlug: "github",
        status: "connected",
        composioConnectedAccountId: "acct-github",
      })
    })

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "list my top 5 repos" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(400)
    expect(context.repos.runs.getById(run.id)?.status).toBe("failed")
    expect(
      context.repos.steps.listByRunId(run.id).some(
        (step) =>
          step.title === "Integration required" &&
          step.payload?.remediation === "toolkit_not_granted" &&
          typeof step.payload?.error === "string" &&
          step.payload.error.includes("not granted")
      )
    ).toBe(true)
  })

  it("creates generic threads with requested tool grants", async () => {
    const { app, context } = createMockRuntimeApp((testContext) => {
      testContext.repos.integrationToolkits.seedFeatured()
      testContext.repos.integrationConnections.create({
        toolkitSlug: "github",
        status: "connected",
        composioConnectedAccountId: "acct-github",
      })
    })

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "List my GitHub repositories",
        toolGrants: [{ toolkitSlug: "github" }],
      }),
    })
    expect(created.status).toBe(201)
    const { thread } = (await created.json()) as { thread: { id: string } }
    const grants = context.repos.toolAccessGrants.listByScope("thread", thread.id)
    expect(grants).toHaveLength(1)
    expect(grants[0]?.toolkitSlug).toBe("github")
  })

  it("executes GitHub composio tool when connected and granted", async () => {
    const { app, context } = createMockRuntimeApp((testContext) => {
      testContext.repos.integrationToolkits.seedFeatured()
      testContext.repos.integrationConnections.create({
        toolkitSlug: "github",
        status: "connected",
        composioConnectedAccountId: "acct-github",
      })
    })

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "List my GitHub repositories" }),
    })
    const { thread, run } = (await created.json()) as {
      thread: { id: string }
      run: { id: string }
    }

    const grant = await app.request(`/api/threads/${thread.id}/tool-grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolkitSlug: "github" }),
    })
    expect(grant.status).toBe(201)

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(context.repos.runs.getById(run.id)?.status).toBe("completed")
    expect(
      context.repos.steps.listByRunId(run.id).some(
        (step) =>
          step.type === "tool-result" &&
          step.status === "completed" &&
          step.payload?.provider === "composio" &&
          step.payload?.toolkitSlug === "github"
      )
    ).toBe(true)
  })

  it("persists native workspace tool evidence in mock runtime", async () => {
    const { app, context } = createMockRuntimeApp()
    const workspace = context.repos.workspaces.ensureGenericAgentisWorkspace()
    const filesRoot = join(
      context.config.storageRoot,
      workspace.backendRef,
      "files"
    )
    await mkdir(filesRoot, { recursive: true })
    await writeFile(join(filesRoot, "demo.md"), "Demo workspace file")
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "What files are in your workspace?" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const steps = context.repos.steps.listByRunId(run.id)
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Native: listWorkspaceFiles",
          type: "tool-result",
          status: "completed",
          payload: expect.objectContaining({
            provider: "native",
            toolName: "listWorkspaceFiles",
            workspaceId: workspace.id,
            output: expect.objectContaining({
              entries: [expect.objectContaining({ path: "demo.md" })],
            }),
          }),
        }),
      ])
    )
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Debug: model input",
          payload: expect.objectContaining({
            provider: "debug",
            kind: "model-input",
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: "user",
                content: "What files are in your workspace?",
              }),
            ]),
            tools: expect.arrayContaining(["listWorkspaceFiles"]),
            toolDetails: expect.arrayContaining([
              expect.objectContaining({
                name: "listWorkspaceFiles",
                description: expect.stringContaining(
                  "List files and directories"
                ),
                inputSchema: expect.objectContaining({
                  typeName: "ZodObject",
                  fields: expect.arrayContaining([
                    expect.objectContaining({ name: "path" }),
                  ]),
                }),
              }),
            ]),
          }),
        }),
        expect.objectContaining({
          title: "Debug: model output",
          payload: expect.objectContaining({
            provider: "debug",
            kind: "model-output",
            assistantParts: expect.arrayContaining([
              expect.objectContaining({
                type: "tool-result",
                toolName: "listWorkspaceFiles",
              }),
            ]),
          }),
        }),
      ])
    )
    const assistant = context.repos.messages
      .listByThreadId(context.repos.runs.getById(run.id)!.threadId)
      .find((message) => message.role === "assistant")
    expect(assistant?.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-result",
          toolName: "listWorkspaceFiles",
          output: expect.objectContaining({ workspaceId: workspace.id }),
        }),
      ])
    )
  }, 10_000)

  it("persists native web search evidence in mock runtime", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Search the web for Agentis launch news",
      }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const steps = context.repos.steps.listByRunId(run.id)
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Native: searchWeb",
          type: "tool-result",
          status: "completed",
          payload: expect.objectContaining({
            provider: "native",
            toolName: "searchWeb",
            input: expect.objectContaining({
              query: "Agentis launch news",
            }),
            output: expect.objectContaining({
              provider: "mock",
              resultCount: 5,
              results: expect.arrayContaining([
                expect.objectContaining({
                  title: expect.stringContaining("Agentis launch news"),
                  url: expect.stringMatching(/^https:\/\//),
                }),
              ]),
            }),
          }),
        }),
      ])
    )
    const assistant = context.repos.messages
      .listByThreadId(context.repos.runs.getById(run.id)!.threadId)
      .find((message) => message.role === "assistant")
    expect(messageText(assistant?.parts ?? [])).toContain("Mock result 1")
    expect(messageText(assistant?.parts ?? [])).toContain("https://example.com")
  }, 10_000)

  it("persists research brief documents in mock runtime", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt:
          "Research AI agent adoption trends and create a markdown research brief with citations.",
      }),
    })
    const { run, thread } = (await created.json()) as {
      run: { id: string }
      thread: { id: string }
    }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const documents = context.repos.documents.list({ threadId: thread.id })
    expect(documents).toEqual([
      expect.objectContaining({
        title: expect.stringMatching(/Research brief/i),
        type: "document",
        runId: run.id,
      }),
    ])
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Native: searchWeb",
          type: "tool-result",
          status: "completed",
        }),
        expect.objectContaining({
          title: expect.stringMatching(/^Document created:/),
          type: "tool-result",
          status: "completed",
        }),
      ])
    )
    const assistant = context.repos.messages
      .listByThreadId(thread.id)
      .find((message) => message.role === "assistant")
    expect(messageText(assistant?.parts ?? [])).toContain("Library")
  }, 10_000)

  it("persists static artifact evidence in mock runtime", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Static Artifact Agent",
      systemPrompt: "Create static artifact outputs.",
      model: "gpt-4o-mini",
      nativeTools: ["documents", "webSearch", "staticArtifacts"],
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Create a static webpage for launch notes." }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(context.repos.artifacts.list({ type: "webpage" })).toEqual([
      expect.objectContaining({
        title: "Mock webpage",
        type: "webpage",
        runId: run.id,
      }),
    ])
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Create static artifact",
          type: "tool-result",
          status: "completed",
          payload: expect.objectContaining({
            provider: "native",
            toolName: "createStaticArtifact",
            output: expect.objectContaining({
              title: "Mock webpage",
              artifactType: "webpage",
              renderMode: "html",
            }),
          }),
        }),
      ])
    )
  }, 10_000)

  it("exposes web search for default custom-agent native permissions", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Search the web for Agentis news." }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Debug: model input",
          payload: expect.objectContaining({
            tools: expect.arrayContaining(["searchWeb"]),
          }),
        }),
      ])
    )
  }, 10_000)

  it("omits web search for non-search prompts", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const debugInput = context.repos.steps
      .listByRunId(run.id)
      .find((step) => step.title === "Debug: model input")
    expect(debugInput?.payload).toMatchObject({
      tools: expect.not.arrayContaining(["searchWeb"]),
    })
  }, 10_000)

  it("omits document tools for custom-agent configurations without native permission", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "No Documents Agent",
      systemPrompt: "Answer without document tools.",
      model: "gpt-4o-mini",
      nativeTools: ["webSearch"],
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Say hello for debug inspection." }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const debugInput = context.repos.steps
      .listByRunId(run.id)
      .find((step) => step.title === "Debug: model input")
    expect(debugInput?.payload).toMatchObject({
      tools: expect.not.arrayContaining(["createDocument"]),
    })
  }, 10_000)

  it("omits web search for custom-agent configurations without native permission", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "No Search Agent",
      systemPrompt: "Answer without web search.",
      model: "gpt-4o-mini",
      nativeTools: [],
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Say hello for debug inspection." }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const debugInput = context.repos.steps
      .listByRunId(run.id)
      .find((step) => step.title === "Debug: model input")
    expect(debugInput?.payload).toMatchObject({
      tools: expect.not.arrayContaining(["searchWeb"]),
    })
  }, 10_000)

  it("uses current custom-agent native tools when a legacy run has no version snapshot", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "No Search Agent",
      systemPrompt: "Answer without web search.",
      model: "gpt-4o-mini",
      nativeTools: [],
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Search the web for Agentis news." }),
    })
    const { run } = (await created.json()) as { run: { id: string } }
    context.db
      .update(runs)
      .set({ agentConfigurationVersionId: null })
      .where(eq(runs.id, run.id))
      .run()

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const debugInput = context.repos.steps
      .listByRunId(run.id)
      .find((step) => step.title === "Debug: model input")
    expect(debugInput?.payload).toMatchObject({
      tools: expect.not.arrayContaining(["searchWeb"]),
    })
  }, 10_000)

  it("fails mock web search runs when the search provider rejects", async () => {
    const { app, context } = createMockRuntimeApp()
    vi.spyOn(WebSearchService.prototype, "search").mockRejectedValueOnce(
      new Error("Search exploded")
    )
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Search the web for Agentis news" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })

    expect(stream.status).toBe(400)
    expect(context.repos.runs.getById(run.id)).toMatchObject({
      status: "failed",
      errorSummary: "Search exploded",
    })
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "error",
          status: "failed",
          title: "Web search failed",
          payload: expect.objectContaining({
            provider: "native",
            toolName: "searchWeb",
            message: "Search exploded",
          }),
        }),
      ])
    )
  })

  it("fails fast when live Gateway credentials are missing", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(
      ctx.repos,
      {
        ...ctx.config,
        mockRuntime: false,
        nodeEnv: "development",
        aiGatewayApiKey: undefined,
        vercelAiGatewayApiKey: undefined,
      },
      services
    )
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Search the web for current AI news" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    const body = (await stream.json()) as { error: string }

    expect(stream.status).toBe(400)
    expect(body.error).toBe("VERCEL_AI_GATEWAY_API_KEY is not configured")
    expect(ctx.repos.runs.getById(run.id)).toMatchObject({
      status: "queued",
      errorSummary: undefined,
    })
  })

  it("validates live Gateway model ids before mutating run state", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(
      ctx.repos,
      {
        ...ctx.config,
        mockRuntime: false,
        nodeEnv: "development",
        aiGatewayApiKey: "gateway-key",
      },
      services
    )
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize workspace status" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }
    ctx.db
      .update(runs)
      .set({ model: "claude-sonnet-4" })
      .where(eq(runs.id, run.id))
      .run()

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    const body = (await stream.json()) as { error: string }

    expect(stream.status).toBe(400)
    expect(body.error).toBe("Gateway model ids must include a provider prefix")
    const runRecord = ctx.repos.runs.getById(run.id)!
    expect(runRecord).toMatchObject({
      status: "queued",
      errorSummary: undefined,
    })
    expect(ctx.repos.messages.listByThreadId(runRecord.threadId)).toHaveLength(
      1
    )
  })

  it("removes assistant claims while workspace mutations are pending approval", () => {
    const parts = suppressTextForPendingApproval([
      { type: "text", text: "The file has been created successfully." },
      {
        type: "tool-result",
        toolCallId: "call_pending",
        toolName: "createWorkspaceFile",
        output: { status: "pending_approval", path: "todolist.md" },
      },
    ])

    expect(messageText(parts)).toBe("")
    expect(parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-result",
          toolName: "createWorkspaceFile",
          output: expect.objectContaining({ status: "pending_approval" }),
        }),
      ])
    )
  })

  it("creates pending approval for plan-mode workspace mutations", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Create a workspace file for approval" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const edit = context.repos.workspaceEdits.getPendingByRunId(run.id)
    expect(edit).toMatchObject({
      status: "pending",
      approvalMode: "plan",
      toolName: "createWorkspaceFile",
    })
    const workspace = context.repos.workspaces.ensureGenericAgentisWorkspace()
    const targetPath = join(
      context.config.storageRoot,
      workspace.backendRef,
      "files",
      edit!.path
    )
    await expect(stat(targetPath)).rejects.toThrow()
    const pendingRun = context.repos.runs.getById(run.id)
    expect(pendingRun?.status).toBe("tool-calling")
    expect(pendingRun?.costUsd).toBe(MOCK_MODEL_COST_USD)
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-call",
          status: "pending",
          payload: expect.objectContaining({
            provider: "native",
            toolName: "createWorkspaceFile",
            approval: expect.objectContaining({ status: "pending" }),
          }),
        }),
      ])
    )
  }, 10_000)

  it("keeps plan-mode workspace mutation assistant text empty before approval", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Create a workspace file for approval" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    await stream.text()

    const assistant = context.repos.messages
      .listByThreadId(context.repos.runs.getById(run.id)!.threadId)
      .find((message) => message.role === "assistant")
    const text = messageText(assistant?.parts ?? [])

    expect(text).toBe("")
  }, 10_000)

  it("approves a pending workspace mutation and records audit metadata", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Create a workspace file then wait" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }
    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    await stream.text()
    const pending = context.repos.workspaceEdits.getPendingByRunId(run.id)!

    const approved = await app.request(
      `/api/runs/${run.id}/tool-approvals/${pending.toolCallId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      }
    )

    expect(approved.status).toBe(200)
    const edit = context.repos.workspaceEdits.getById(pending.id)
    expect(edit).toMatchObject({
      status: "applied",
      contentHashAfter: expect.any(String),
    })
    const file = await readFile(
      join(
        context.config.storageRoot,
        context.repos.workspaces.ensureGenericAgentisWorkspace().backendRef,
        "files",
        pending.path
      ),
      "utf8"
    )
    expect(file).toContain("Created by Agentis mock runtime.")
    const completedRun = context.repos.runs.getById(run.id)
    expect(completedRun?.status).toBe("completed")
    expect(completedRun?.costUsd).toBe(MOCK_MODEL_COST_USD)
  }, 10_000)

  it("denies a pending workspace mutation without mutating the file", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Create a workspace file but deny it" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }
    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    await stream.text()
    const pending = context.repos.workspaceEdits.getPendingByRunId(run.id)!

    const denied = await app.request(
      `/api/runs/${run.id}/tool-approvals/${pending.toolCallId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "deny" }),
      }
    )

    expect(denied.status).toBe(200)
    expect(context.repos.workspaceEdits.getById(pending.id)).toMatchObject({
      status: "denied",
    })
    await expect(
      stat(
        join(
          context.config.storageRoot,
          context.repos.workspaces.ensureGenericAgentisWorkspace().backendRef,
          "files",
          pending.path
        )
      )
    ).rejects.toThrow()
  }, 10_000)

  it("uses requested follow-up mode for workspace mutation approvals", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Create a workspace file immediately",
        mode: "agent",
      }),
    })
    const { thread } = (await created.json()) as {
      thread: { id: string }
    }

    const followUp = await app.request(`/api/threads/${thread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Create another workspace file for approval",
        mode: "plan",
      }),
    })
    const { run } = (await followUp.json()) as { run: { id: string } }
    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    await stream.text()

    expect(context.repos.threads.getById(thread.id)?.mode).toBe("plan")
    expect(
      context.repos.workspaceEdits.getPendingByRunId(run.id)
    ).toMatchObject({
      status: "pending",
      approvalMode: "plan",
    })
  }, 10_000)

  it("applies execute-mode workspace mutations without approval", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Create a workspace file immediately",
        mode: "agent",
      }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const steps = context.repos.steps.listByRunId(run.id)
    const edit = context.repos.workspaceEdits.getByRunAndToolCall(
      run.id,
      `mock-native-mutation-${run.id}`
    )
    expect(edit).toMatchObject({ status: "applied", approvalMode: "agent" })
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-call",
          status: "completed",
          payload: expect.objectContaining({
            changedFiles: [expect.objectContaining({ path: edit?.path })],
          }),
        }),
      ])
    )
    const file = await readFile(
      join(
        context.config.storageRoot,
        context.repos.workspaces.ensureGenericAgentisWorkspace().backendRef,
        "files",
        edit!.path
      ),
      "utf8"
    )
    expect(file).toContain("Created by Agentis mock runtime.")
  }, 10_000)

  it("executes mock sandbox commands and persists execution evidence", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "mock sandbox run echo hello",
        mode: "agent",
      }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const execution = context.repos.workspaceExecutions.getByRunAndToolCall(
      run.id,
      `mock-native-execution-${run.id}`
    )
    expect(execution).toMatchObject({ status: "applied", kind: "command" })
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Native: runWorkspaceCommand",
          status: "completed",
          payload: expect.objectContaining({
            provider: "native",
            toolName: "runWorkspaceCommand",
            output: expect.objectContaining({
              executionId: execution?.id,
              exitCode: 0,
              stdout: expect.stringContaining("hello"),
            }),
          }),
        }),
      ])
    )
  }, 10_000)

  it("approves plan-mode mock sandbox commands through workspace approval", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "mock sandbox run echo hello",
        mode: "plan",
      }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const pending = context.repos.workspaceExecutions.getByRunAndToolCall(
      run.id,
      `mock-native-execution-${run.id}`
    )
    expect(pending).toMatchObject({
      status: "pending",
      approvalMode: "plan",
    })

    const approved = await app.request(
      `/api/runs/${run.id}/tool-approvals/${pending!.toolCallId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      }
    )

    expect(approved.status).toBe(200)
    const execution = context.repos.workspaceExecutions.getById(pending!.id)
    expect(execution).toMatchObject({
      status: "applied",
      result: expect.objectContaining({
        exitCode: 0,
        stdout: expect.stringContaining("hello"),
      }),
    })
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Native: runWorkspaceCommand",
          status: "completed",
          payload: expect.objectContaining({
            approval: expect.objectContaining({ status: "approved" }),
            output: expect.objectContaining({
              executionId: execution?.id,
              exitCode: 0,
              stdout: expect.stringContaining("hello"),
            }),
          }),
        }),
      ])
    )
  }, 10_000)

  it("does not route substring matches like profile to native workspace tools", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Update my profile summary" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(context.repos.steps.listByRunId(run.id)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Native: listWorkspaceFiles" }),
      ])
    )
  }, 10_000)

  it("persists debug model input and output for run timeline inspection", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Debug Agent",
      systemPrompt: "Answer as the debug agent.",
      model: "gpt-4o-mini",
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Say hello for debug inspection." }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const steps = context.repos.steps.listByRunId(run.id)
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Debug: model input",
          type: "reasoning",
          payload: expect.objectContaining({
            provider: "debug",
            kind: "model-input",
            systemPrompt: expect.stringContaining(
              "## Agent instructions\nAnswer as the debug agent."
            ),
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: "user",
                content: "Say hello for debug inspection.",
              }),
            ]),
            tools: expect.arrayContaining([
              "listWorkspaceFiles",
              "createDocument",
            ]),
            toolDetails: expect.arrayContaining([
              expect.objectContaining({
                name: "listWorkspaceFiles",
                description: expect.stringContaining(
                  "List files and directories"
                ),
                inputSchema: expect.objectContaining({
                  typeName: "ZodObject",
                  fields: expect.arrayContaining([
                    expect.objectContaining({ name: "path" }),
                    expect.objectContaining({ name: "recursive" }),
                  ]),
                }),
              }),
              expect.objectContaining({
                name: "createDocument",
                description: expect.stringContaining(
                  "Create a durable text document"
                ),
              }),
            ]),
          }),
        }),
        expect.objectContaining({
          title: "Debug: model output",
          type: "reasoning",
          payload: expect.objectContaining({
            provider: "debug",
            kind: "model-output",
            assistantParts: expect.arrayContaining([
              expect.objectContaining({
                type: "text",
                text: expect.stringContaining(
                  "Hello from Agentis mock runtime."
                ),
              }),
            ]),
            usage: expect.objectContaining({ totalTokens: expect.any(Number) }),
          }),
        }),
      ])
    )
  }, 10_000)

  it("fails loudly when a run thread has no workspace", async () => {
    const { app, context } = createMockRuntimeApp()
    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "What files are in your workspace?" }),
    })
    const { thread, run } = (await created.json()) as {
      thread: { id: string }
      run: { id: string }
    }
    context.db
      .update(threads)
      .set({ workspaceId: null })
      .where(eq(threads.id, thread.id))
      .run()

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })

    expect(stream.status).toBe(400)
    expect(context.repos.runs.getById(run.id)).toMatchObject({
      status: "failed",
      errorSummary: "Thread does not have a workspace.",
    })
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "error",
          status: "failed",
          payload: expect.objectContaining({
            provider: "native",
            code: "workspace_not_found",
          }),
        }),
      ])
    )
  })

  it("loads only pinned global and agent memories into selected-agent thread context", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Customer Insights Analyst",
      systemPrompt: "Answer as the customer insights analyst.",
      model: "gpt-4o-mini",
    })
    context.repos.savedMemories.create({
      content:
        "Use the beta workspace positioning when summarizing customer themes.",
      category: "memory_category_organization",
      importance: "high",
      usageGuidance: "Use in customer insight synthesis.",
      tags: ["beta"],
      scope: "global",
      pinnedToContext: true,
    })
    context.repos.savedMemories.create({
      content:
        "Cluster qualitative feedback by segment before recommending action.",
      category: "memory_category_domain_knowledge",
      importance: "high",
      usageGuidance: "Use for customer feedback threads.",
      tags: ["customer"],
      scope: "agent",
      associatedAgent: agent.id,
      pinnedToContext: false,
    })
    context.repos.savedMemories.create({
      content: "Preserve customer language in summaries.",
      category: "memory_category_preference",
      importance: "medium",
      usageGuidance: "Use for executive briefs.",
      tags: ["voice"],
      scope: "agent",
      associatedAgent: agent.id,
      pinnedToContext: true,
    })

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Summarize recent feedback.",
        agentId: agent.id,
      }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const steps = context.repos.steps.listByRunId(run.id)
    const memoryStep = steps.find(
      (step) => step.title === "Agent memories loaded"
    )
    expect(memoryStep?.payload).toMatchObject({
      agentMemoryCount: 1,
      globalMemoryCount: 1,
    })
    const debugInput = steps.find((step) => step.title === "Debug: model input")
    expect(debugInput?.payload).toMatchObject({
      memories: expect.objectContaining({
        agent: [
          expect.objectContaining({
            content: "Preserve customer language in summaries.",
          }),
        ],
        global: [
          expect.objectContaining({
            content:
              "Use the beta workspace positioning when summarizing customer themes.",
          }),
        ],
      }),
      memoryPrompt: expect.stringContaining("Preserve customer language"),
    })
    expect(debugInput?.payload).toMatchObject({
      memories: expect.objectContaining({
        agent: expect.not.arrayContaining([
          expect.objectContaining({
            content:
              "Cluster qualitative feedback by segment before recommending action.",
          }),
        ]),
      }),
    })
    expect(
      (debugInput?.payload as { systemPrompt?: string } | undefined)
        ?.systemPrompt
    ).not.toContain("Preserve customer language")
    expect(
      (debugInput?.payload as { systemPrompt?: string } | undefined)
        ?.systemPrompt
    ).not.toContain("beta workspace positioning")
  }, 10_000)

  it("loads pinned global and agent memories into agent run context", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    context.repos.savedMemories.create({
      content:
        "Always cite customer interviews before recommending roadmap changes.",
      category: "memory_category_preference",
      importance: "high",
      usageGuidance: "Use during roadmap analysis.",
      tags: ["roadmap"],
      scope: "global",
      pinnedToContext: true,
    })
    context.repos.savedMemories.create({
      content: "Draft notes are optional until promoted.",
      category: "memory_category_preference",
      importance: "low",
      usageGuidance: "Use only when pinned.",
      tags: ["draft"],
      scope: "agent",
      associatedAgent: agent.id,
      pinnedToContext: false,
    })
    context.repos.savedMemories.create({
      content:
        "Research Agent should include source quality notes in every brief.",
      category: "memory_category_tools_workflows",
      importance: "high",
      usageGuidance: "Use in research briefs.",
      tags: ["research"],
      scope: "agent",
      associatedAgent: agent.id,
      pinnedToContext: true,
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const memoryStep = context.repos.steps
      .listByRunId(run.id)
      .find((step) => step.title === "Agent memories loaded")
    expect(memoryStep?.payload).toMatchObject({
      agentMemoryCount: 1,
      globalMemoryCount: 1,
    })
  }, 10_000)

  it("loads the bound agent configuration version when streaming a test-thread run", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const updated = context.repos.agents.update(agent.id, {
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
    })!
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(context.repos.runs.getById(run.id)).toMatchObject({
      status: "completed",
      model: "gpt-4.1-mini",
      agentConfigurationVersionId: updated.currentConfigurationVersion.id,
    })
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Agent configuration loaded",
          payload: expect.objectContaining({
            agentId: agent.id,
            agentConfigurationVersionId: updated.currentConfigurationVersion.id,
            model: "gpt-4.1-mini",
          }),
        }),
      ])
    )
  }, 10_000)

  it("fails the run and thread when the bound agent configuration is missing", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { thread, run } = (await created.json()) as {
      thread: { id: string }
      run: { id: string; agentConfigurationVersionId: string }
    }
    vi.spyOn(
      context.repos.agents,
      "getConfigurationVersionById"
    ).mockReturnValue(null)

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })

    expect(stream.status).toBe(404)
    const message = `Agent configuration version not found: ${run.agentConfigurationVersionId}`
    expect(context.repos.runs.getById(run.id)).toMatchObject({
      status: "failed",
      errorSummary: message,
    })
    expect(context.repos.threads.getById(thread.id)?.status).toBe("failed")
    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "error",
          status: "failed",
          title: "Run failed",
          payload: expect.objectContaining({ message }),
        }),
      ])
    )
  })

  it("keeps the agent configuration binding on follow-up runs", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer as the research agent.",
      model: "gpt-4o-mini",
    })
    const updated = context.repos.agents.update(agent.id, {
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
    })!
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Summarize this workspace" }),
    })
    const { thread } = (await created.json()) as { thread: { id: string } }

    const followUp = await app.request(`/api/threads/${thread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Continue with source quality notes" }),
    })
    const { run } = (await followUp.json()) as {
      run: { id: string; agentConfigurationVersionId?: string }
    }

    expect(run.agentConfigurationVersionId).toBe(
      updated.currentConfigurationVersion.id
    )

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    const steps = context.repos.steps.listByRunId(run.id)
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Agent configuration loaded",
          payload: expect.objectContaining({
            agentConfigurationVersionId: updated.currentConfigurationVersion.id,
          }),
        }),
      ])
    )
    expect(
      steps.some((step) => step.title === "Source workflow context loaded")
    ).toBe(false)
  }, 20_000)

  it("loads source workflow context on linked agent follow-up runs", async () => {
    const { app, context } = createMockRuntimeApp()
    const agent = context.repos.agents.create({
      name: "Promoted Research Agent",
      systemPrompt: "Answer as the promoted research agent.",
      model: "gpt-4o-mini",
      sourceThread: {
        id: "thread_source",
        title: "Investigate support backlog",
      },
      sourceWorkflow: {
        summary: "Investigate support backlog",
        firstUserPrompt: "Review support backlog patterns",
      },
    })
    const created = await app.request(`/api/agents/${agent.id}/test-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Try the promoted workflow" }),
    })
    const { thread } = (await created.json()) as { thread: { id: string } }

    const followUp = await app.request(`/api/threads/${thread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Continue the source workflow" }),
    })
    const { run } = (await followUp.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(200)
    await stream.text()

    expect(context.repos.steps.listByRunId(run.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Source workflow context loaded",
          payload: expect.objectContaining({
            sourceThreadId: "thread_source",
            sourceThreadTitle: "Investigate support backlog",
            summary: "Investigate support backlog",
            firstUserPrompt: "Review support backlog patterns",
          }),
        }),
      ])
    )
  }, 10_000)
})
