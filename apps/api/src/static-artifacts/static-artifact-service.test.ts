import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { StaticArtifactService } from "./static-artifact-service.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"

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
})
