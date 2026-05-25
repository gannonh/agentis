import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { ArtifactService } from "../artifacts/artifact-service.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("artifact routes", () => {
  it("uploads, lists, filters, and downloads artifacts", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const project = ctx.repos.projects.create({ name: "Docs" })

    const form = new FormData()
    form.set("title", "Q2 Brief")
    form.set("type", "document")
    form.set("projectId", project.id)
    form.set(
      "file",
      new File(["# Brief\n\nSummary"], "brief.md", { type: "text/markdown" })
    )

    const uploaded = await app.request("/api/artifacts", {
      method: "POST",
      body: form,
    })
    expect(uploaded.status).toBe(201)
    const artifact = (await uploaded.json()) as {
      id: string
      projectNameSnapshot?: string
    }
    expect(artifact.projectNameSnapshot).toBe("Docs")

    const listed = await app.request("/api/artifacts?query=Brief")
    const listBody = (await listed.json()) as { id: string }[]
    expect(listBody).toHaveLength(1)

    const download = await app.request(`/api/artifacts/${artifact.id}/download`)
    expect(download.status).toBe(200)
    expect(download.headers.get("content-type")).toContain("text")
    expect(await download.text()).toContain("Brief")
  })

  it("returns 400 for invalid list query parameters", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const response = await app.request("/api/artifacts?type=not-a-type")
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_request")
  })

  it("links generated test-thread artifacts to the owning agent detail library", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Test Research Agent",
      prompt: "Create notes",
      model: agent.model,
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    })
    const artifactService = new ArtifactService(ctx.repos, ctx.config)

    const generated = artifactService.registerGenerated({
      title: "Research notes",
      type: "document",
      filename: "research-notes.md",
      content: "# Research notes",
      runId: createdThread.run.id,
    })

    expect(generated.ok).toBe(true)
    if (!generated.ok) return
    expect(generated.artifact).toMatchObject({
      threadId: createdThread.thread.id,
      agentId: agent.id,
      agentNameSnapshot: "Research Agent",
    })

    const detail = await app.request(`/api/agents/${agent.id}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      information: {
        library: { totalCount: number; items: { title: string }[] }
      }
    }
    expect(body.information.library.totalCount).toBe(1)
    expect(body.information.library.items).toMatchObject([
      { title: "Research notes" },
    ])
  })

  it("rejects uploads when thread provenance is missing", () => {
    ctx = createTestContext()
    const artifactService = new ArtifactService(ctx.repos, ctx.config)

    const uploaded = artifactService.upload({
      title: "Orphan notes",
      type: "document",
      filename: "orphan-notes.md",
      data: Buffer.from("# Orphan"),
      threadId: "missing-thread",
    })

    expect(uploaded).toMatchObject({
      ok: false,
      code: "invalid_artifact_provenance",
    })
    expect(ctx.repos.artifacts.count()).toBe(0)
  })

  it("rejects generated artifacts when run and thread provenance disagree", () => {
    ctx = createTestContext()
    const firstAgent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const secondAgent = ctx.repos.agents.create({
      name: "Strategy Agent",
      systemPrompt: "Plan carefully.",
      model: "gpt-4o-mini",
    })
    const firstThread = ctx.repos.threads.createWithInitialRun({
      title: "Research thread",
      prompt: "Create notes",
      model: firstAgent.model,
      mode: "agent",
      agentId: firstAgent.id,
      agentNameSnapshot: firstAgent.name,
      agentConfigurationVersionId: firstAgent.currentConfigurationVersion.id,
    })
    const secondThread = ctx.repos.threads.createWithInitialRun({
      title: "Strategy thread",
      prompt: "Create strategy",
      model: secondAgent.model,
      mode: "agent",
      agentId: secondAgent.id,
      agentNameSnapshot: secondAgent.name,
      agentConfigurationVersionId: secondAgent.currentConfigurationVersion.id,
    })
    const artifactService = new ArtifactService(ctx.repos, ctx.config)

    const generated = artifactService.registerGenerated({
      title: "Mismatched notes",
      type: "document",
      filename: "mismatched-notes.md",
      content: "# Mismatch",
      runId: firstThread.run.id,
      threadId: secondThread.thread.id,
    })

    expect(generated).toMatchObject({
      ok: false,
      code: "invalid_artifact_provenance",
    })
    expect(ctx.repos.artifacts.count()).toBe(0)
  })

  it("links uploaded thread artifacts to the owning agent detail library", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Uploaded Research Thread",
      prompt: "Upload notes",
      model: agent.model,
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    })
    const form = new FormData()
    form.set("title", "Uploaded notes")
    form.set("type", "document")
    form.set("threadId", createdThread.thread.id)
    form.set(
      "file",
      new File(["# Uploaded notes"], "uploaded-notes.md", {
        type: "text/markdown",
      })
    )

    const uploaded = await app.request("/api/artifacts", {
      method: "POST",
      body: form,
    })
    expect(uploaded.status).toBe(201)
    const artifact = (await uploaded.json()) as {
      threadId?: string
      agentId?: string
      storageKey?: string
    }
    expect(artifact).toMatchObject({
      threadId: createdThread.thread.id,
      agentId: agent.id,
    })
    expect(artifact).not.toHaveProperty("storageKey")

    const detail = await app.request(`/api/agents/${agent.id}`)
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      information: {
        library: { totalCount: number; items: { title: string }[] }
      }
    }
    expect(body.information.library.totalCount).toBe(1)
    expect(body.information.library.items).toMatchObject([
      { title: "Uploaded notes" },
    ])
  })

  it("returns artifact_blob_missing when file is absent", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const artifact = ctx.repos.artifacts.create({
      title: "Missing",
      type: "document",
      mimeType: "text/plain",
      sizeBytes: 1,
      storageKey: "artifacts/missing.txt",
    })

    const response = await app.request(`/api/artifacts/${artifact.id}/download`)
    expect(response.status).toBe(404)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("artifact_blob_missing")
  })
})
