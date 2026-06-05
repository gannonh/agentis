import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { DocumentService } from "../documents/document-service.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("artifact routes", () => {
  it("lists artifacts by sibling artifact type", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const createdDocument = documentService.createMarkdownDocument({
      title: "Markdown brief",
      content: "# Markdown brief",
      visibilityScope: "global",
    })
    expect(createdDocument.ok).toBe(true)
    ctx.repos.artifacts.create({
      title: "Landing page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 20,
      storageKey: "artifacts/landing/index.html",
      visibilityScope: "global",
    })
    ctx.repos.artifacts.create({
      title: "Sales deck",
      type: "slides",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 30,
      storageKey: "artifacts/slides/index.html",
      visibilityScope: "global",
    })

    const documents = await app.request("/api/artifacts?type=document")
    expect(documents.status).toBe(200)
    expect(await documents.json()).toMatchObject([
      { title: "Markdown brief", type: "document" },
    ])

    const webpages = await app.request("/api/artifacts?type=webpage")
    expect(webpages.status).toBe(200)
    expect(await webpages.json()).toMatchObject([
      { title: "Landing page", type: "webpage" },
    ])

    const slides = await app.request("/api/artifacts?type=slides")
    expect(slides.status).toBe(200)
    expect(await slides.json()).toMatchObject([
      { title: "Sales deck", type: "slides" },
    ])
  })

  it("serves markdown document detail, content updates, visibility changes, and downloads through artifact routes", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const thread = ctx.repos.threads.createWithInitialRun({
      title: "Artifact scope thread",
      prompt: "Create artifact",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const created = documentService.createMarkdownDocument({
      title: "Editable artifact",
      content: "# Original artifact",
      visibilityScope: "thread",
      threadId: thread.thread.id,
      runId: thread.run.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const detail = await app.request(`/api/artifacts/${created.document.id}/detail`)
    expect(detail.status).toBe(200)
    expect(await detail.json()).toMatchObject({
      artifact: {
        id: created.document.id,
        type: "document",
        title: "Editable artifact",
        currentVersion: 1,
        visibilityScope: "thread",
      },
      content: "# Original artifact",
      currentVersion: 1,
      selectedVersion: 1,
      versions: [{ version: 1 }],
    })

    const updated = await app.request(`/api/artifacts/${created.document.id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "# Updated artifact",
        baseVersion: 1,
        changeSummary: "Updated through artifact route",
      }),
    })
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({
      artifact: {
        id: created.document.id,
        type: "document",
        currentVersion: 2,
      },
      currentVersion: 2,
    })

    const visibility = await app.request(
      `/api/artifacts/${created.document.id}/visibility`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibilityScope: "global" }),
      }
    )
    expect(visibility.status).toBe(200)
    expect(await visibility.json()).toMatchObject({
      previousVisibilityScope: "thread",
      artifact: {
        id: created.document.id,
        type: "document",
        visibilityScope: "global",
      },
    })

    const download = await app.request(`/api/artifacts/${created.document.id}/download`)
    expect(download.status).toBe(200)
    expect(download.headers.get("content-type")).toContain("text/markdown")
    expect(await download.text()).toBe("# Updated artifact")
  })

  it("rejects content updates for non-document artifacts with artifact errors", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const webpage = ctx.repos.artifacts.create({
      title: "Landing page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 20,
      storageKey: "artifacts/landing/index.html",
      visibilityScope: "global",
    })

    const response = await app.request(`/api/artifacts/${webpage.id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "<h1>Updated</h1>",
        baseVersion: 1,
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      code: "artifact_not_markdown",
    })
  })

  it("returns artifact errors for invalid visibility scope changes", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const webpage = ctx.repos.artifacts.create({
      title: "Landing page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 20,
      storageKey: "artifacts/landing/index.html",
      visibilityScope: "global",
    })

    const response = await app.request(
      `/api/artifacts/${webpage.id}/visibility`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibilityScope: "project" }),
      }
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      code: "invalid_artifact_scope",
    })
  })

  it("updates non-document artifact visibility without changing artifact type", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const project = ctx.repos.projects.create({ name: "Public site" })
    const webpage = ctx.repos.artifacts.create({
      title: "Landing page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 20,
      storageKey: "artifacts/landing/index.html",
      visibilityScope: "global",
    })

    const response = await app.request(`/api/artifacts/${webpage.id}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visibilityScope: "project",
        projectId: project.id,
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      previousVisibilityScope: "global",
      artifact: {
        id: webpage.id,
        type: "webpage",
        visibilityScope: "project",
        projectId: project.id,
        projectNameSnapshot: "Public site",
      },
    })
  })

  it("keeps document compatibility routes available for markdown documents", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Compatibility document",
      content: "# Compatibility",
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const detail = await app.request(`/api/documents/${created.document.id}/detail`)

    expect(detail.status).toBe(200)
    expect(await detail.json()).toMatchObject({
      document: {
        id: created.document.id,
        type: "document",
        title: "Compatibility document",
      },
      content: "# Compatibility",
    })
  })
})
