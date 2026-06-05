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

    const detail = await app.request(`/api/documents/${document.id}/detail`)
    expect(detail.status).toBe(200)
    const detailBody = (await detail.json()) as {
      content: string
      truncated?: boolean
      currentVersion?: number
      selectedVersion?: number
      versions: { version: number }[]
    }
    expect(detailBody.content).toContain("Brief")
    expect(detailBody.truncated).toBe(false)
    expect(detailBody.currentVersion).toBe(1)
    expect(detailBody.selectedVersion).toBe(1)
    expect(detailBody.versions).toHaveLength(1)
  })

  it("truncates large text previews on the detail endpoint", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Long brief",
      content: "# Long brief\n\n" + "x".repeat(200),
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    ctx.config.documentMaxUploadBytes = 20

    const detail = await app.request(
      `/api/documents/${created.document.id}/detail`
    )
    expect(detail.status).toBe(200)
    const detailBody = (await detail.json()) as {
      content: string
      truncated?: boolean
    }
    expect(detailBody.content.length).toBeLessThanOrEqual(20)
    expect(detailBody.truncated).toBe(true)
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

  it("filters documents by source, agent, and visibility scope", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const project = ctx.repos.projects.create({ name: "Launch" })
    const agent = ctx.repos.agents.create({
      name: "Docs Agent",
      systemPrompt: "Write docs.",
      model: "gpt-4o-mini",
    })
    const agentThread = ctx.repos.threads.createWithInitialRun({
      title: "Agent evidence thread",
      prompt: "Create report",
      model: agent.model,
      mode: "agent",
      projectId: project.id,
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: agent.currentConfigurationVersion.id,
    })
    const userThread = ctx.repos.threads.createWithInitialRun({
      title: "User evidence thread",
      prompt: "Upload report",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const generated = documentService.registerGenerated({
      title: "Agent project report",
      content: "# Agent project report",
      projectId: project.id,
      threadId: agentThread.thread.id,
      runId: agentThread.run.id,
    })
    expect(generated.ok).toBe(true)

    const form = new FormData()
    form.set("title", "User thread notes")
    form.set("documentType", "markdown")
    form.set("threadId", userThread.thread.id)
    form.set(
      "file",
      new File(["# Notes"], "notes.md", { type: "text/markdown" })
    )
    const uploaded = await app.request("/api/documents", {
      method: "POST",
      body: form,
    })
    expect(uploaded.status).toBe(201)

    const byAgentSource = await app.request("/api/documents?source=agent")
    expect(
      (await byAgentSource.json()) as Array<{ title: string }>
    ).toMatchObject([{ title: "Agent project report" }])

    const bySpecificAgent = await app.request(
      `/api/documents?agentId=${agent.id}`
    )
    expect(
      (await bySpecificAgent.json()) as Array<{ title: string }>
    ).toMatchObject([{ title: "Agent project report" }])

    const byUserSource = await app.request("/api/documents?source=user")
    expect(
      (await byUserSource.json()) as Array<{ title: string }>
    ).toMatchObject([{ title: "User thread notes" }])

    const byThreadScope = await app.request(
      `/api/documents?visibilityScope=thread&threadId=${userThread.thread.id}`
    )
    expect(
      (await byThreadScope.json()) as Array<{ title: string }>
    ).toMatchObject([{ title: "User thread notes" }])
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
      documentType: "document",
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
      documentType: "document",
      mimeType: "text/plain",
      sizeBytes: 1,
      storageKey: "documents/missing.txt",
    })

    const response = await app.request(`/api/documents/${document.id}/download`)
    expect(response.status).toBe(404)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("document_blob_missing")
  })

  it("returns prior version content on detail without changing current version", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Versioned brief",
      content: "# Version 1",
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const updated = documentService.updateDocumentContent({
      documentId: created.document.id,
      content: "# Version 2",
      baseVersion: 1,
    })
    expect(updated.ok).toBe(true)

    const detail = await app.request(
      `/api/documents/${created.document.id}/detail?version=1`
    )
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as {
      content: string
      selectedVersion: number
      currentVersion: number
    }
    expect(body.content).toContain("Version 1")
    expect(body.selectedVersion).toBe(1)
    expect(body.currentVersion).toBe(2)
  })

  it("rejects fractional document detail versions", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Versioned brief",
      content: "# Version 1",
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const detail = await app.request(
      `/api/documents/${created.document.id}/detail?version=1.5`
    )

    expect(detail.status).toBe(400)
    expect(await detail.json()).toMatchObject({ code: "invalid_request" })
  })

  it("updates document visibility scope with an explicit projectId", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const project = ctx.repos.projects.create({ name: "Customer insights" })
    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Scope thread",
      prompt: "Create doc",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const created = documentService.createMarkdownDocument({
      title: "Thread brief",
      content: "# Thread brief",
      visibilityScope: "thread",
      threadId: thread.thread.id,
      runId: thread.run.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const response = await app.request(
      `/api/documents/${created.document.id}/visibility`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibilityScope: "project",
          projectId: project.id,
        }),
      }
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      previousVisibilityScope: "thread",
      document: {
        id: created.document.id,
        visibilityScope: "project",
        projectId: project.id,
        projectNameSnapshot: "Customer insights",
      },
    })
  })

  it("updates document visibility scope through the API", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Scope thread",
      prompt: "Create doc",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const created = documentService.createMarkdownDocument({
      title: "Scoped brief",
      content: "# Scoped brief",
      visibilityScope: "thread",
      threadId: thread.thread.id,
      runId: thread.run.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const response = await app.request(
      `/api/documents/${created.document.id}/visibility`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibilityScope: "global" }),
      }
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      previousVisibilityScope: "thread",
      document: {
        id: created.document.id,
        visibilityScope: "global",
      },
    })
  })

  it("updates markdown content and rejects stale baseVersion conflicts", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Editable brief",
      content: "# Original",
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const saved = await app.request(
      `/api/documents/${created.document.id}/content`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Updated",
          baseVersion: 1,
          changeSummary: "Updated in document workspace",
        }),
      }
    )
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      currentVersion: 2,
      document: { title: "Editable brief" },
    })

    const conflict = await app.request(
      `/api/documents/${created.document.id}/content`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Stale edit",
          baseVersion: 1,
        }),
      }
    )
    expect(conflict.status).toBe(409)
    expect(await conflict.json()).toMatchObject({
      code: "document_version_conflict",
    })
  })

  it("does not update non-document artifacts through document content routes", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const artifact = ctx.repos.artifacts.create({
      title: "Image",
      type: "image",
      mimeType: "image/png",
      sizeBytes: 4,
      storageKey: "image.png",
      visibilityScope: "global",
    })

    const response = await app.request(
      `/api/documents/${artifact.id}/content`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Not allowed",
          baseVersion: 1,
        }),
      }
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      code: "document_not_found",
    })
  })
})
