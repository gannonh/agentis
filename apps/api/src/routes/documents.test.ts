import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { DocumentService } from "../documents/document-service.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("document routes", () => {
  it("uploads, lists, filters, and downloads documents", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const project = ctx.repos.projects.create({ name: "Docs" })

    const form = new FormData()
    form.set("title", "Q2 Brief")
    form.set("documentType", "markdown")
    form.set("projectId", project.id)
    form.set(
      "file",
      new File(["# Brief\n\nSummary"], "brief.md", { type: "text/markdown" })
    )

    const uploaded = await app.request("/api/documents", {
      method: "POST",
      body: form,
    })
    expect(uploaded.status).toBe(201)
    const document = (await uploaded.json()) as {
      id: string
      projectNameSnapshot?: string
      currentVersion?: number
      visibilityScope?: string
    }
    expect(document.projectNameSnapshot).toBe("Docs")
    expect(document.currentVersion).toBe(1)
    expect(document.visibilityScope).toBe("project")
    expect(ctx.repos.documents.listVersions(document.id)).toHaveLength(1)

    const listed = await app.request("/api/documents?query=Brief")
    const listBody = (await listed.json()) as { id: string }[]
    expect(listBody).toHaveLength(1)

    const download = await app.request(`/api/documents/${document.id}/download`)
    expect(download.status).toBe(200)
    expect(download.headers.get("content-type")).toContain("text")
    expect(await download.text()).toContain("Brief")
  })

  it("uploads documents without owner as global documents", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const form = new FormData()
    form.set("title", "Global notes")
    form.set("documentType", "markdown")
    form.set(
      "file",
      new File(["# Global"], "global.md", { type: "text/markdown" })
    )

    const uploaded = await app.request("/api/documents", {
      method: "POST",
      body: form,
    })

    expect(uploaded.status).toBe(201)
    expect(await uploaded.json()).toMatchObject({
      title: "Global notes",
      visibilityScope: "global",
      currentVersion: 1,
    })
  })

  it("returns 400 for invalid list query parameters", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const response = await app.request("/api/documents?documentType=not-a-type")
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_request")
  })

  it("links generated test-thread documents to the owning agent detail library", async () => {
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
    const documentService = new DocumentService(ctx.repos, ctx.config)

    const generated = documentService.registerGenerated({
      title: "Research notes",
      content: "# Research notes",
      runId: createdThread.run.id,
    })

    expect(generated.ok).toBe(true)
    if (!generated.ok) return
    expect(generated.document).toMatchObject({
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

  it("rejects uploads when thread provenance is missing", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const form = new FormData()
    form.set("title", "Orphan notes")
    form.set("documentType", "markdown")
    form.set("threadId", "missing-thread")
    form.set(
      "file",
      new File(["# Orphan"], "orphan-notes.md", { type: "text/markdown" })
    )

    const response = await app.request("/api/documents", {
      method: "POST",
      body: form,
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      code: "invalid_document_provenance",
    })
    expect(ctx.repos.documents.count()).toBe(0)
  })

  it("rejects uploads in the service when thread provenance is missing", () => {
    ctx = createTestContext()
    const documentService = new DocumentService(ctx.repos, ctx.config)

    const uploaded = documentService.upload({
      title: "Orphan notes",
      documentType: "markdown",
      filename: "orphan-notes.md",
      data: Buffer.from("# Orphan"),
      threadId: "missing-thread",
    })

    expect(uploaded).toMatchObject({
      ok: false,
      code: "invalid_document_provenance",
    })
    expect(ctx.repos.documents.count()).toBe(0)
  })

  it("rejects generated documents when run and thread provenance disagree", () => {
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
    const documentService = new DocumentService(ctx.repos, ctx.config)

    const generated = documentService.registerGenerated({
      title: "Mismatched notes",
      content: "# Mismatch",
      runId: firstThread.run.id,
      threadId: secondThread.thread.id,
    })

    expect(generated).toMatchObject({
      ok: false,
      code: "invalid_document_provenance",
    })
    expect(ctx.repos.documents.count()).toBe(0)
  })

  it("links uploaded thread documents to the owning agent detail library", async () => {
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
    form.set("documentType", "markdown")
    form.set("threadId", createdThread.thread.id)
    form.set(
      "file",
      new File(["# Uploaded notes"], "uploaded-notes.md", {
        type: "text/markdown",
      })
    )

    const uploaded = await app.request("/api/documents", {
      method: "POST",
      body: form,
    })
    expect(uploaded.status).toBe(201)
    const document = (await uploaded.json()) as {
      threadId?: string
      agentId?: string
      storageKey?: string
    }
    expect(document).toMatchObject({
      threadId: createdThread.thread.id,
      agentId: agent.id,
    })
    expect(document).not.toHaveProperty("storageKey")

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

  it("returns document_blob_missing when file is absent", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const document = ctx.repos.documents.create({
      title: "Missing",
      documentType: "markdown",
      mimeType: "text/plain",
      sizeBytes: 1,
      storageKey: "documents/missing.txt",
    })

    const response = await app.request(`/api/documents/${document.id}/download`)
    expect(response.status).toBe(404)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("document_blob_missing")
  })
})
