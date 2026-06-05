import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { DocumentService } from "../documents/document-service.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"
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
    expect(download.headers.get("content-disposition")).toBe(
      'attachment; filename="Editable_artifact.md"'
    )
    expect(await download.text()).toBe("# Updated artifact")
  })

  it("truncates artifact detail previews from a bounded byte read", async () => {
    ctx = createTestContext()
    ctx.config.documentMaxUploadBytes = 8
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const storage = new LocalDocumentStorage(ctx.config)
    const storageKey = "artifacts/large-preview.md"
    storage.write(storageKey, Buffer.from("hello 😀 world", "utf8"))
    const artifact = ctx.repos.artifacts.create({
      title: "Large preview",
      type: "document",
      contentFormat: "markdown",
      mimeType: "text/markdown",
      sizeBytes: 16,
      storageKey,
      visibilityScope: "global",
    })

    const response = await app.request(`/api/artifacts/${artifact.id}/detail`)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      content: "hello ",
      truncated: true,
    })
  })

  it("serves static artifact assets by persisted asset metadata", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const storage = new LocalDocumentStorage(ctx.config)
    storage.write("artifacts/slides/assets/slide-1.png", Buffer.from("png"))
    const artifact = ctx.repos.artifacts.create({
      title: "Visual deck",
      type: "slides",
      contentFormat: "manifest",
      mimeType: "application/json",
      sizeBytes: 2,
      storageKey: "artifacts/slides/manifest.json",
      visibilityScope: "global",
      metadata: {
        artifactType: "slides",
        renderMode: "polishedImage",
        theme: "cinematic",
        generationPath: "polishedImageSlides",
        slideCount: 1,
        assetReferences: [
          {
            assetId: "slide_1",
            slideIndex: 1,
            storageKey: "artifacts/slides/assets/slide-1.png",
            mimeType: "image/png",
            sizeBytes: 3,
            altText: "Opening slide",
          },
        ],
        safetyValidationResult: { status: "passed", warnings: [], errors: [] },
        generationWarnings: [],
      },
    })

    const response = await app.request(
      `/api/artifacts/${artifact.id}/assets/slide_1`
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/png")
    expect(await response.text()).toBe("png")
  })

  it("returns artifact errors for unchanged markdown content updates", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Unchanged artifact",
      content: "# Same artifact",
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const response = await app.request(
      `/api/artifacts/${created.document.id}/content`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Same artifact",
          baseVersion: 1,
        }),
      }
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      code: "artifact_content_unchanged",
    })
  })

  it("returns artifact errors for stale content update versions", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const documentService = new DocumentService(ctx.repos, ctx.config)
    const created = documentService.createMarkdownDocument({
      title: "Versioned artifact",
      content: "# Versioned artifact",
      visibilityScope: "global",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const response = await app.request(
      `/api/artifacts/${created.document.id}/content`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "# Changed artifact",
          baseVersion: 2,
        }),
      }
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: "artifact_version_conflict",
    })
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
      error: "Project-scoped artifacts require a project",
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
