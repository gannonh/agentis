import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { StaticArtifactService } from "./static-artifact-service.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"
import type { PolishedSlideProvider } from "./polished-slide-provider.js"

function createRunContext() {
  const ctx = createTestContext()
  const project = ctx.repos.projects.create({ name: "Static project" })
  const { thread, run } = ctx.repos.threads.createWithInitialRun({
    title: "Static thread",
    prompt: "Create a page",
    model: "gpt-4o-mini",
    mode: "agent",
    projectId: project.id,
  })
  const service = new StaticArtifactService(ctx.repos, ctx.config)
  return { ctx, project, thread, run, service }
}

const availablePolishedProvider: PolishedSlideProvider = {
  availability: () => ({
    available: true,
    provider: "agentis-test-images",
    model: "mock-image-1",
  }),
  generateSlides: (input) =>
    input.slides.map((slide) => ({
      slideIndex: slide.slideIndex,
      data: Buffer.from(`image-${slide.slideIndex}`, "utf8"),
      mimeType: "image/png",
      altText: slide.title,
    })),
}

describe("StaticArtifactService", () => {
  it("creates and finds Artifact-backed static HTML outputs with bounded links", () => {
    const { ctx, project, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "Launch webpage",
      description: "Static launch page",
      artifactType: "webpage",
      renderMode: "html",
      contentBrief: "Explain the launch plan.",
      audience: "Launch team",
      purpose: "Planning",
      theme: "editorial",
      visibilityScope: "project",
      projectId: project.id,
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        title: "Launch webpage",
        artifactType: "webpage",
        renderMode: "html",
        version: 1,
        viewPath: expect.stringMatching(/^\/artifacts\//),
        downloadPath: expect.stringMatching(/^\/api\/artifacts\//),
        theme: "editorial",
      },
    })

    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact).toMatchObject({
      type: "webpage",
      contentFormat: "html",
      visibilityScope: "project",
      projectId: project.id,
      runId: run.id,
      currentVersion: 1,
      metadata: expect.objectContaining({
        artifactType: "webpage",
        renderMode: "html",
        theme: "editorial",
        generationPath: "modelHtml",
      }),
    })
    expect(ctx.repos.artifacts.listVersions(created.output.artifactId)).toHaveLength(1)

    const storage = new LocalDocumentStorage(ctx.config)
    expect(storage.read(artifact!.storageKey).toString("utf8")).toContain(
      "Explain the launch plan."
    )

    const found = service.findStaticArtifacts({
      query: "Launch",
      artifactType: "webpage",
      renderMode: "html",
      runContext: { threadId: thread.id, projectId: project.id, runId: run.id },
    })
    expect(found).toEqual({
      ok: true,
      output: {
        items: [
          expect.objectContaining({
            artifactId: created.output.artifactId,
            title: "Launch webpage",
            artifactType: "webpage",
            renderMode: "html",
            version: 1,
            viewPath: `/artifacts/${created.output.artifactId}`,
            theme: "editorial",
          }),
        ],
        resultCount: 1,
        truncated: false,
      },
    })
    ctx.cleanup()
  })

  it("treats slide-oriented themes as non-fatal webpage style hints", () => {
    const { ctx, project, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "Board update webpage",
      artifactType: "webpage",
      renderMode: "html",
      contentBrief: "Create a webpage version of the board update.",
      theme: "corporate",
      visibilityScope: "project",
      projectId: project.id,
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        title: "Board update webpage",
        artifactType: "webpage",
        renderMode: "html",
        theme: "corporate",
      },
    })

    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact?.metadata).toMatchObject({
      artifactType: "webpage",
      renderMode: "html",
      theme: "corporate",
    })
    ctx.cleanup()
  })

  it("rejects invalid render modes, unsafe HTML, and oversized HTML visibly", () => {
    const { ctx, thread, run, service } = createRunContext()

    expect(
      service.createStaticArtifact({
        title: "Image webpage",
        artifactType: "webpage",
        renderMode: "polishedImage",
        contentBrief: "Make it visual.",
        threadId: thread.id,
        runId: run.id,
      })
    ).toMatchObject({ ok: false, code: "static_artifact_invalid_render_mode" })

    expect(
      service.createStaticArtifact({
        title: "Unsafe page",
        artifactType: "webpage",
        renderMode: "html",
        contentBrief: "Unsafe",
        generatedHtml: "<script>fetch('/api/runs')</script>",
        threadId: thread.id,
        runId: run.id,
      })
    ).toMatchObject({ ok: false, code: "static_artifact_invalid_html" })

    const lowLimitService = new StaticArtifactService(ctx.repos, {
      ...ctx.config,
      documentMaxUploadBytes: 10,
    })
    expect(
      lowLimitService.createStaticArtifact({
        title: "Large page",
        artifactType: "webpage",
        renderMode: "html",
        contentBrief: "Large static page",
        threadId: thread.id,
        runId: run.id,
      })
    ).toMatchObject({ ok: false, code: "static_artifact_bundle_too_large" })
    ctx.cleanup()
  })

  it("edits supported static artifacts by creating a new version and preserving version metadata", () => {
    const { ctx, thread, run, service } = createRunContext()
    const created = service.createStaticArtifact({
      title: "Launch deck",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: "Slide 1: Problem\nSlide 2: Plan",
      theme: "keynote",
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    const edited = service.editStaticArtifact({
      artifactId: created.output.artifactId,
      contentBrief: "Refresh the plan slide with owner details.",
      changeSummary: "Updated plan slide",
      theme: "corporate",
      runContext: { threadId: thread.id, runId: run.id },
    })

    expect(edited).toMatchObject({
      ok: true,
      output: {
        artifactId: created.output.artifactId,
        title: "Launch deck",
        artifactType: "slides",
        renderMode: "html",
        previousVersion: 1,
        version: 2,
        viewPath: `/artifacts/${created.output.artifactId}`,
      },
    })
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact).toMatchObject({
      currentVersion: 2,
      metadata: expect.objectContaining({
        artifactType: "slides",
        renderMode: "html",
        theme: "corporate",
        versionHistory: expect.arrayContaining([
          expect.objectContaining({ version: 1, theme: "keynote" }),
          expect.objectContaining({ version: 2, theme: "corporate" }),
        ]),
      }),
    })
    expect(ctx.repos.artifacts.listVersions(created.output.artifactId)).toHaveLength(2)
    ctx.cleanup()
  })

  it("expands prose presentation briefs with listed topics into multiple slides", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "How to Write a Good Changelog",
      artifactType: "slides",
      renderMode: "html",
      contentBrief:
        "Full presentation on how to write a good changelog including introduction, why changelogs matter, structure, writing tips, common mistakes, examples, and tools.",
      theme: "corporate",
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        artifactType: "slides",
        renderMode: "html",
        slideCount: 7,
      },
    })
    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(Array.from(html.matchAll(/class="slide/g))).toHaveLength(7)
    expect(html).toContain("Why changelogs matter")

    const edited = service.editStaticArtifact({
      artifactId: created.output.artifactId,
      contentBrief:
        "Full presentation covering introduction, audience, categories, examples, release notes, automation, and review checklist.",
      changeSummary: "Expanded deck",
      runContext: { threadId: thread.id, runId: run.id },
    })

    expect(edited).toMatchObject({
      ok: true,
      output: { version: 2 },
    })
    const updated = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(updated?.metadata).toMatchObject({ slideCount: 7 })
    ctx.cleanup()
  })

  it("preserves body content from structured presentation outlines", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "How to Write a Good Changelog",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: [
        "Title Slide",
        "",
        "How to Write a Good Changelog",
        "",
        "What is a Changelog?",
        "",
        "Definition and purpose of a changelog",
        "Importance for users and developers",
        "",
        "Key Components of a Good Changelog",
        "",
        "Clear version numbers and dates",
        "Categorized changes (Added, Changed, Fixed, Deprecated, Removed)",
      ].join("\n"),
      theme: "corporate",
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        artifactType: "slides",
        renderMode: "html",
        slideCount: 3,
      },
    })
    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(Array.from(html.matchAll(/class="slide/g))).toHaveLength(3)
    expect(html).toContain("<h1>What is a Changelog?</h1>")
    expect(html).toContain("<li>Definition and purpose of a changelog</li>")
    expect(html).toContain("<li>Importance for users and developers</li>")
    expect(html).toContain(
      "<li>Categorized changes (Added, Changed, Fixed, Deprecated, Removed)</li>"
    )
    ctx.cleanup()
  })

  it("preserves body content from slide-numbered presentation outlines", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "How to Write a Good Changelog",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: [
        "Slide 1: Title",
        "",
        "How to Write a Good Changelog",
        "Slide 2: Purpose of a Changelog",
        "",
        "Communicates updates clearly to users and contributors",
        "Tracks what has changed between versions",
        "Helps in troubleshooting and auditing changes",
        "Slide 3: Key Components",
        "",
        "Version number and release date",
        "Clear, concise descriptions",
      ].join("\n"),
      theme: "corporate",
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        artifactType: "slides",
        renderMode: "html",
        slideCount: 3,
      },
    })
    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(html).toContain("<h1>Purpose of a Changelog</h1>")
    expect(html).toContain(
      "<li>Communicates updates clearly to users and contributors</li>"
    )
    expect(html).toContain("<li>Tracks what has changed between versions</li>")
    expect(html).toContain("<h1>Key Components</h1>")
    expect(html).toContain("<li>Version number and release date</li>")
    ctx.cleanup()
  })

  it("splits inline slide marker detail into slide body content", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "How to Create a Good Changelog",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: [
        "Slide 1: Title - How to Create a Good Changelog",
        "Slide 2: Importance of a Good Changelog - Helps users track changes, ensures transparency, facilitates communication",
        "Slide 3: Key Elements - Date, version, description, categories (added, changed, fixed)",
      ].join("\n"),
      theme: "auto",
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        artifactType: "slides",
        renderMode: "html",
        slideCount: 3,
      },
    })
    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(html).toContain('<section class="slide title-slide" data-slide="1">')
    expect(html).toContain('<section class="slide content-slide" data-slide="2">')
    expect(html).toContain("<h1>Importance of a Good Changelog</h1>")
    expect(html).toContain(
      "<p>Helps users track changes, ensures transparency, facilitates communication</p>"
    )
    expect(html).not.toContain(
      "<h1>Slide 2: Importance of a Good Changelog - Helps users track changes"
    )
    ctx.cleanup()
  })

  it("appends partial generated slide HTML without replacing the existing deck", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "How to Create a Good Changelog",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: [
        "Slide 1: Title - How to Create a Good Changelog",
        "Slide 2: Importance - Helps users track changes",
        "Slide 3: Key Elements - Dates, versions, and categories",
      ].join("\n"),
      theme: "auto",
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    const edited = service.editStaticArtifact({
      artifactId: created.output.artifactId,
      contentBrief: "Add examples at the end.",
      changeSummary: "Added detailed examples at the end",
      generatedHtml: [
        "<h2>Slide 4: Detailed Examples of Good Changelogs</h2>",
        "<ul>",
        "<li><strong>Example 1: Simple Version Update</strong><br>Version 1.2.0 - 2024-06-01<br>Added: New user profile page</li>",
        "<li><strong>Example 2: Semantic Versioning Style</strong><br>Version 2.0.0 - 2024-05-20<br>Added: Support for API v3</li>",
        "</ul>",
      ].join("\n"),
      runContext: { threadId: thread.id, runId: run.id },
    })

    expect(edited).toMatchObject({
      ok: true,
      output: {
        artifactId: created.output.artifactId,
        version: 2,
      },
    })
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact?.metadata).toMatchObject({ slideCount: 4 })
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(html).toContain("<!doctype html>")
    expect(Array.from(html.matchAll(/class="slide/g))).toHaveLength(4)
    expect(html).toContain("<h1>Importance</h1>")
    expect(html).toContain("<p>Helps users track changes</p>")
    expect(html).toContain("<h1>Detailed Examples of Good Changelogs</h1>")
    expect(html).toContain("<li>Example 1: Simple Version Update")
    expect(html).not.toMatch(/^<h2>/)
    ctx.cleanup()
  })

  it("parses div-based model slide decks into multiple navigable slides", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "Thread-scoped artifacts",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: "Eight-slide deck",
      theme: "developer",
      generatedHtml: [
        "<!doctype html><html><body>",
        '<main data-static-artifact="slides">',
        '<div class="slide"><h1>Title</h1><p>Intro</p></div>',
        '<div class="slide"><h1>Foundations</h1><p>What artifacts are</p></div>',
        '<div class="slide"><h1>Scopes</h1><p>Thread, project, global</p></div>',
        '<div class="slide"><h1>Deep dive</h1><p>Isolation and promotion</p></div>',
        '<div class="slide"><h1>Lifecycle</h1><p>Create through persist</p></div>',
        '<div class="slide"><h1>When to use</h1><p>Five use cases</p></div>',
        '<div class="slide"><h1>Comparison</h1><p>Scope table</p></div>',
        '<div class="slide"><h1>Summary</h1><p>Best practices</p></div>',
        "</main></body></html>",
      ].join(""),
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    expect(created.output.slideCount).toBe(8)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(Array.from(html.matchAll(/class="slide/g))).toHaveLength(8)
    expect(html).toContain("developer · 1/8")
    expect(html).toContain("querySelectorAll('.slide')")
    ctx.cleanup()
  })

  it("splits collapsed slide decks that use page markers like 01 / 08", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "Thread-scoped artifacts",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: "Eight-slide deck",
      theme: "developer",
      generatedHtml: [
        '<main data-static-artifact="slides">',
        '<section class="slide"><h1>Thread-Scoped Working Artifacts</h1>',
        "<ul>",
        "<li>01 / 08</li><li>Agentis · Platform Concepts</li><li>Intro body</li>",
        "<li>02 / 08</li><li>Foundations</li><li>What Is an Artifact?</li><li>Artifact definition</li>",
        "<li>03 / 08</li><li>Scopes</li><li>Thread vs project vs global</li>",
        "</ul></section></main>",
      ].join(""),
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    expect(created.output.slideCount).toBe(3)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(Array.from(html.matchAll(/class="slide/g))).toHaveLength(3)
    expect(html).toContain("<h1>Foundations</h1>")
    expect(html).toContain("<li>What Is an Artifact?</li>")
    expect(html).toContain("<h1>Scopes</h1>")
    ctx.cleanup()
  })

  it("normalizes bare section slide HTML into a navigable deck", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "Thread-scoped artifacts",
      artifactType: "slides",
      renderMode: "html",
      contentBrief: "Outline only",
      theme: "corporate",
      generatedHtml: [
        "<!doctype html><html><body>",
        '<main data-static-artifact="slides">',
        "<section><h1>Slide 1</h1><p>Intro</p></section>",
        "<section><h1>Slide 2</h1><p>Details</p></section>",
        "<section><h1>Slide 3</h1><p>Workflow</p></section>",
        "</main></body></html>",
      ].join(""),
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact?.metadata).toMatchObject({ slideCount: 3 })
    const storage = new LocalDocumentStorage(ctx.config)
    const html = storage.read(artifact!.storageKey).toString("utf8")
    expect(Array.from(html.matchAll(/class="slide/g))).toHaveLength(3)

    const read = service.readStaticArtifact({
      artifactId: created.output.artifactId,
      maxChars: 12_000,
      runContext: { threadId: thread.id, runId: run.id },
    })
    expect(read).toMatchObject({
      ok: true,
      output: {
        slideCount: 3,
        contentTextTruncated: false,
      },
    })
    ctx.cleanup()
  })

  it("reads exact stored text from static slide artifacts", () => {
    const { ctx, thread, run, service } = createRunContext()

    const created = service.createStaticArtifact({
      title: "Title-only deck",
      artifactType: "slides",
      renderMode: "html",
      contentBrief:
        "Slide 1: Title\nSlide 2: R&D <beta> \"quoted\" and 'apostrophe'",
      theme: "corporate",
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    const read = service.readStaticArtifact({
      artifactId: created.output.artifactId,
      runContext: { threadId: thread.id, runId: run.id },
    })

    expect(read).toMatchObject({
      ok: true,
      output: {
        artifactId: created.output.artifactId,
        contentText: expect.stringContaining(
          "R&D <beta> \"quoted\" and 'apostrophe'"
        ),
        contentTextTruncated: false,
      },
    })
    if (!read.ok) throw new Error(read.message)
    expect(read.output.contentText).not.toContain("Communicates updates clearly")
    expect(read.output.contentText).not.toContain("&amp;")
    expect(read.output.contentText).not.toContain("&lt;")
    expect(read.output.contentText).not.toContain("<section")
    ctx.cleanup()
  })

  it("preserves all prior static artifact metadata fields in edit history", () => {
    const { ctx, thread, run, service } = createRunContext()
    const storage = new LocalDocumentStorage(ctx.config)
    const storageKey = "artifacts/static-history/versions/1.html"
    storage.write(storageKey, Buffer.from("<main>Original deck</main>", "utf8"))
    const originalMetadata = {
      artifactType: "slides",
      renderMode: "html",
      theme: "keynote",
      bespokeStyleBriefSummary: "Use stark editorial photography and red accents.",
      generationPath: "modelDeckHtml",
      slideCount: 2,
      assetReferences: [
        {
          assetId: "asset_hero",
          slideIndex: 1,
          storageKey: "artifacts/static-history/assets/hero.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          altText: "Launch hero image",
        },
      ],
      provider: "agentis-mock",
      providerModel: "image-model-1",
      safetyValidationResult: {
        status: "warning",
        checkedAt: "2026-06-04T00:00:00.000Z",
        warnings: ["Inline chart uses reduced motion."],
        errors: [],
      },
      generationWarnings: ["Dense slide text was shortened."],
    }
    const { artifact: original } = ctx.repos.artifacts.createWithInitialVersion({
      title: "Metadata-rich deck",
      type: "slides",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 26,
      storageKey,
      visibilityScope: "thread",
      threadId: thread.id,
      runId: run.id,
      metadata: originalMetadata,
      contentHash: "hash_v1",
      contentStorageKey: storageKey,
      createdByRunId: run.id,
      createdByThreadId: thread.id,
    })

    const edited = service.editStaticArtifact({
      artifactId: original.id,
      contentBrief: "Refresh the metadata-rich deck.",
      changeSummary: "Refresh deck",
      theme: "corporate",
      runContext: { threadId: thread.id, runId: run.id },
    })

    expect(edited).toMatchObject({ ok: true })
    const artifact = ctx.repos.artifacts.getById(original.id)
    const metadata = artifact?.metadata as
      | { versionHistory?: Array<Record<string, unknown>> }
      | undefined
    expect(metadata?.versionHistory?.[0]).toMatchObject({
      version: 1,
      artifactType: "slides",
      renderMode: "html",
      theme: "keynote",
      bespokeStyleBriefSummary:
        "Use stark editorial photography and red accents.",
      generationPath: "modelDeckHtml",
      slideCount: 2,
      assetReferences: [
        expect.objectContaining({
          assetId: "asset_hero",
          slideIndex: 1,
        }),
      ],
      provider: "agentis-mock",
      providerModel: "image-model-1",
      safetyValidationResult: {
        status: "warning",
        checkedAt: "2026-06-04T00:00:00.000Z",
        warnings: ["Inline chart uses reduced motion."],
        errors: [],
      },
      generationWarnings: ["Dense slide text was shortened."],
    })
    expect(metadata?.versionHistory?.[1]).toMatchObject({
      version: 2,
      theme: "corporate",
      generationPath: "modelDeckHtml",
    })
    ctx.cleanup()
  })

  it("rejects edits for unsupported or inaccessible artifacts", () => {
    const { ctx, thread, run, service } = createRunContext()
    const other = ctx.repos.threads.createWithInitialRun({
      title: "Other",
      prompt: "Other",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const document = ctx.repos.artifacts.create({
      title: "Markdown doc",
      type: "document",
      contentFormat: "markdown",
      mimeType: "text/markdown",
      sizeBytes: 3,
      storageKey: "documents/doc.md",
      visibilityScope: "thread",
      threadId: thread.id,
    })

    expect(
      service.editStaticArtifact({
        artifactId: document.id,
        contentBrief: "Update it",
        changeSummary: "Change",
        runContext: { threadId: thread.id, runId: run.id },
      })
    ).toMatchObject({ ok: false, code: "static_artifact_invalid_type" })

    const created = service.createStaticArtifact({
      title: "Thread page",
      artifactType: "webpage",
      renderMode: "html",
      contentBrief: "Thread only",
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    expect(
      service.editStaticArtifact({
        artifactId: created.output.artifactId,
        contentBrief: "Update it",
        changeSummary: "Change",
        runContext: { threadId: other.thread.id, runId: other.run.id },
      })
    ).toMatchObject({ ok: false, code: "static_artifact_not_found" })
    ctx.cleanup()
  })

  it("fails polished image slides before generation when the provider is unavailable", () => {
    const { ctx, thread, run, service } = createRunContext()

    expect(
      service.createStaticArtifact({
        title: "Visual deck",
        artifactType: "slides",
        renderMode: "polishedImage",
        contentBrief: "Three cinematic launch slides.",
        theme: "cinematic",
        threadId: thread.id,
        runId: run.id,
      })
    ).toMatchObject({
      ok: false,
      code: "static_artifact_provider_unavailable",
      remediation: expect.stringContaining("Configure"),
    })
    ctx.cleanup()
  })

  it("persists polished image slides when the provider is available", () => {
    const { ctx, thread, run } = createRunContext()
    const service = new StaticArtifactService(ctx.repos, ctx.config, {
      polishedSlideProvider: availablePolishedProvider,
    })

    const created = service.createStaticArtifact({
      title: "Visual deck",
      artifactType: "slides",
      renderMode: "polishedImage",
      contentBrief: "Open with the launch moment.\nClose with the roadmap.",
      theme: "cinematic",
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        title: "Visual deck",
        artifactType: "slides",
        renderMode: "polishedImage",
        provider: "agentis-test-images",
        slideCount: 2,
      },
    })
    if (!created.ok) throw new Error(created.message)
    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact).toMatchObject({
      type: "slides",
      contentFormat: "manifest",
      mimeType: "application/json",
      metadata: expect.objectContaining({
        renderMode: "polishedImage",
        provider: "agentis-test-images",
        providerModel: "mock-image-1",
        assetReferences: [
          expect.objectContaining({ assetId: expect.any(String), slideIndex: 1, mimeType: "image/png" }),
          expect.objectContaining({ assetId: expect.any(String), slideIndex: 2, mimeType: "image/png" }),
        ],
      }),
    })
    const storage = new LocalDocumentStorage(ctx.config)
    const asset = (artifact!.metadata!.assetReferences as Array<{ storageKey: string }>)[0]
    expect(storage.read(asset.storageKey).toString("utf8")).toBe("image-1")
    expect(storage.read(artifact!.storageKey).toString("utf8")).toContain("assetReferences")
    ctx.cleanup()
  })
})
