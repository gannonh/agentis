import { existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { createTestContext } from "../test/setup.js"
import { DocumentService } from "./document-service.js"

describe("DocumentService", () => {
  it("returns a distinct error code when markdown content is empty", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)

    expect(
      service.createMarkdownDocument({
        title: "Empty",
        content: "   ",
        visibilityScope: "global",
      })
    ).toMatchObject({
      ok: false,
      code: "document_content_required",
      status: 400,
    })

    ctx.cleanup()
  })

  it("creates markdown documents with version 1 and a section outline", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Launch" })
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Launch notes",
      prompt: "Create a durable plan",
      model: "gpt-4o-mini",
      mode: "agent",
      projectId: project.id,
    })
    const service = new DocumentService(ctx.repos, ctx.config)

    const created = service.createMarkdownDocument({
      title: "Launch plan",
      content: "# Plan\n\nIntro\n\n## Risks\n\n- Scope",
      visibilityScope: "project",
      projectId: project.id,
      threadId: createdThread.thread.id,
      runId: createdThread.run.id,
    })

    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return
    expect(created.document).toMatchObject({
      title: "Launch plan",
      documentType: "markdown",
      contentFormat: "markdown",
      visibilityScope: "project",
      currentVersion: 1,
      projectNameSnapshot: "Launch",
      threadTitleSnapshot: "Launch notes",
    })
    expect(created.document.currentVersionId).toBeTruthy()

    const read = service.readDocument({
      documentId: created.document.id,
      runContext: {
        threadId: createdThread.thread.id,
        projectId: project.id,
      },
    })

    expect(read).toMatchObject({ ok: true })
    if (!read.ok) return
    expect(read.content).toContain("# Plan")
    expect(read.outline.map((section) => section.path)).toEqual([
      "Plan",
      "Plan > Risks",
    ])
    expect(read.currentVersion).toBe(1)
    ctx.cleanup()
  })

  it("filters accessible documents by thread, project, and global visibility", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Docs" })
    const otherProject = ctx.repos.projects.create({ name: "Other" })
    const source = ctx.repos.threads.createWithInitialRun({
      title: "Source",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
      projectId: project.id,
    })
    const sameProject = ctx.repos.threads.createWithInitialRun({
      title: "Same project",
      prompt: "Find notes",
      model: "gpt-4o-mini",
      mode: "agent",
      projectId: project.id,
    })
    const outside = ctx.repos.threads.createWithInitialRun({
      title: "Outside",
      prompt: "Find notes",
      model: "gpt-4o-mini",
      mode: "agent",
      projectId: otherProject.id,
    })
    const service = new DocumentService(ctx.repos, ctx.config)

    for (const input of [
      { title: "Thread only", visibilityScope: "thread" as const },
      { title: "Project shared", visibilityScope: "project" as const },
      { title: "Global shared", visibilityScope: "global" as const },
    ]) {
      const created = service.createMarkdownDocument({
        ...input,
        content: `# ${input.title}`,
        projectId: project.id,
        threadId: source.thread.id,
        runId: source.run.id,
      })
      expect(created).toMatchObject({ ok: true })
    }

    expect(
      service
        .findDocuments({
          runContext: { threadId: source.thread.id, projectId: project.id },
        })
        .map((document) => document.title)
    ).toEqual(["Global shared", "Project shared", "Thread only"])
    expect(
      service
        .findDocuments({
          runContext: {
            threadId: sameProject.thread.id,
            projectId: project.id,
          },
        })
        .map((document) => document.title)
    ).toEqual(["Global shared", "Project shared"])
    expect(
      service
        .findDocuments({
          runContext: {
            threadId: outside.thread.id,
            projectId: otherProject.id,
          },
        })
        .map((document) => document.title)
    ).toEqual(["Global shared"])
    ctx.cleanup()
  })

  it("uploads markdown documents with version 1 and global scope by default", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)

    const uploaded = service.upload({
      title: "Uploaded playbook",
      documentType: "markdown",
      filename: "playbook.md",
      data: Buffer.from("# Uploaded\n\nInitial content"),
    })

    expect(uploaded).toMatchObject({ ok: true })
    if (!uploaded.ok) return
    expect(uploaded.document).toMatchObject({
      visibilityScope: "global",
      currentVersion: 1,
      contentFormat: "markdown",
    })
    expect(ctx.repos.documents.listVersions(uploaded.document.id)).toHaveLength(
      1
    )
    expect(
      service.readDocument({
        documentId: uploaded.document.id,
        runContext: { threadId: "any-thread" },
      })
    ).toMatchObject({ ok: true, currentVersion: 1 })
    ctx.cleanup()
  })

  it("rejects document scopes without required owners", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)

    expect(
      service.createMarkdownDocument({
        title: "Project orphan",
        content: "# Orphan",
        visibilityScope: "project",
      })
    ).toMatchObject({ ok: false, code: "invalid_document_scope" })
    expect(
      service.createMarkdownDocument({
        title: "Thread orphan",
        content: "# Orphan",
        visibilityScope: "thread",
      })
    ).toMatchObject({ ok: false, code: "invalid_document_scope" })
    expect(ctx.repos.documents.count()).toBe(0)
    ctx.cleanup()
  })

  it("rejects documents with invalid project or thread provenance", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Source project" })
    const otherProject = ctx.repos.projects.create({ name: "Other project" })
    const source = ctx.repos.threads.createWithInitialRun({
      title: "Source thread",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
      projectId: project.id,
    })
    const service = new DocumentService(ctx.repos, ctx.config)

    expect(
      service.createMarkdownDocument({
        title: "Missing project",
        content: "# Missing",
        visibilityScope: "project",
        projectId: "missing-project",
        threadId: source.thread.id,
      })
    ).toMatchObject({ ok: false, code: "invalid_document_provenance" })

    expect(
      service.createMarkdownDocument({
        title: "Mismatched project",
        content: "# Mismatch",
        visibilityScope: "project",
        projectId: otherProject.id,
        threadId: source.thread.id,
      })
    ).toMatchObject({ ok: false, code: "invalid_document_provenance" })

    expect(ctx.repos.documents.count()).toBe(0)
    ctx.cleanup()
  })

  it("updates one markdown section and appends sections with new versions", () => {
    const ctx = createTestContext()
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Living doc",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Playbook",
      content: "# Playbook\n\nIntro\n\n## Steps\n\nOld steps",
      visibilityScope: "thread",
      threadId: createdThread.thread.id,
      runId: createdThread.run.id,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    const updated = service.updateDocumentSection({
      documentId: created.document.id,
      sectionPath: "Playbook > Steps",
      content: "New steps",
      changeSummary: "Refresh steps",
      runContext: { threadId: createdThread.thread.id },
    })
    expect(updated).toMatchObject({
      ok: true,
      previousVersion: 1,
      currentVersion: 2,
    })

    const appended = service.appendDocumentSection({
      documentId: created.document.id,
      parentSectionPath: "Playbook",
      heading: "Follow-up",
      content: "Follow-up notes",
      changeSummary: "Add follow-up",
      runContext: { threadId: createdThread.thread.id },
    })
    expect(appended).toMatchObject({
      ok: true,
      previousVersion: 2,
      currentVersion: 3,
    })

    const read = service.readDocument({
      documentId: created.document.id,
      runContext: { threadId: createdThread.thread.id },
    })
    expect(read).toMatchObject({ ok: true, currentVersion: 3 })
    if (!read.ok) return
    expect(read.content).toContain("## Steps\n\nNew steps")
    expect(read.content).toContain("## Follow-up\n\nFollow-up notes")
    expect(read.content.indexOf("## Steps")).toBeLessThan(
      read.content.indexOf("## Follow-up")
    )
    expect(ctx.repos.documents.listVersions(created.document.id)).toHaveLength(
      3
    )
    ctx.cleanup()
  })

  it("assigns project scope when an explicit projectId is provided", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Insights" })
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Scope doc",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Thread-only summary",
      content: "# Thread-only summary\n\nBody",
      visibilityScope: "thread",
      threadId: createdThread.thread.id,
      runId: createdThread.run.id,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    const scoped = service.updateDocumentVisibility({
      documentId: created.document.id,
      visibilityScope: "project",
      projectId: project.id,
      runContext: { threadId: createdThread.thread.id },
    })
    expect(scoped).toMatchObject({
      ok: true,
      previousVisibilityScope: "thread",
    })
    if (!scoped.ok) return
    expect(scoped.document.visibilityScope).toBe("project")
    expect(scoped.document.projectId).toBe(project.id)
    expect(scoped.document.projectNameSnapshot).toBe("Insights")
    ctx.cleanup()
  })

  it("updates document visibility scope without creating a duplicate", () => {
    const ctx = createTestContext()
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Scope doc",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Insight summary",
      content: "# Insight summary\n\nBody",
      visibilityScope: "thread",
      threadId: createdThread.thread.id,
      runId: createdThread.run.id,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    const widened = service.updateDocumentVisibility({
      documentId: created.document.id,
      visibilityScope: "global",
      runContext: { threadId: createdThread.thread.id },
    })
    expect(widened).toMatchObject({
      ok: true,
      previousVisibilityScope: "thread",
    })
    if (!widened.ok) return
    expect(widened.document.visibilityScope).toBe("global")
    expect(widened.document.id).toBe(created.document.id)
    expect(ctx.repos.documents.count()).toBe(1)
    ctx.cleanup()
  })

  it("reads bounded content, missing versions, and older versions", () => {
    const ctx = createTestContext()
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Versioned doc",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Versioned",
      content: `# Versioned\n\n${"A".repeat(100)}`,
      visibilityScope: "thread",
      threadId: createdThread.thread.id,
      runId: createdThread.run.id,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    const truncated = service.readDocument({
      documentId: created.document.id,
      maxChars: 20,
      runContext: { threadId: createdThread.thread.id },
    })
    expect(truncated).toMatchObject({ ok: true, truncated: true, maxChars: 20 })
    if (!truncated.ok) return
    expect(truncated.content).toHaveLength(20)

    expect(
      service.readDocument({
        documentId: created.document.id,
        version: 99,
        runContext: { threadId: createdThread.thread.id },
      })
    ).toMatchObject({ ok: false, code: "document_version_not_found" })

    const updated = service.appendDocumentSection({
      documentId: created.document.id,
      heading: "Next",
      content: "New content",
      runContext: { threadId: createdThread.thread.id },
    })
    expect(updated).toMatchObject({ ok: true, currentVersion: 2 })
    const versionOne = service.readDocument({
      documentId: created.document.id,
      version: 1,
      runContext: { threadId: createdThread.thread.id },
    })
    expect(versionOne).toMatchObject({ ok: true, currentVersion: 2 })
    if (!versionOne.ok) return
    expect(versionOne.content).not.toContain("New content")
    ctx.cleanup()
  })

  it("does not leave metadata or content divergence when version persistence fails", () => {
    const ctx = createTestContext()
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Rollback doc",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const service = new DocumentService(ctx.repos, ctx.config)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const createWithInitialVersion = vi
      .spyOn(ctx.repos.documents, "createWithInitialVersion")
      .mockImplementationOnce(() => {
        throw new Error("database unavailable")
      })

    expect(
      service.createMarkdownDocument({
        title: "Rollback",
        content: "# Rollback",
        visibilityScope: "thread",
        threadId: createdThread.thread.id,
        runId: createdThread.run.id,
      })
    ).toMatchObject({ ok: false, code: "document_storage_failed" })
    expect(ctx.repos.documents.count()).toBe(0)
    createWithInitialVersion.mockRestore()

    const created = service.createMarkdownDocument({
      title: "Rollback",
      content: "# Rollback\n\nOriginal",
      visibilityScope: "thread",
      threadId: createdThread.thread.id,
      runId: createdThread.run.id,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    vi.spyOn(ctx.repos.documents, "updateWithVersion").mockImplementationOnce(
      () => {
        throw new Error("database unavailable")
      }
    )
    expect(
      service.appendDocumentSection({
        documentId: created.document.id,
        heading: "Failed",
        content: "Should not persist",
        runContext: { threadId: createdThread.thread.id },
      })
    ).toMatchObject({ ok: false, code: "document_storage_failed" })

    const read = service.readDocument({
      documentId: created.document.id,
      runContext: { threadId: createdThread.thread.id },
    })
    expect(read).toMatchObject({ ok: true, currentVersion: 1 })
    if (!read.ok) return
    expect(read.content).toContain("Original")
    expect(read.content).not.toContain("Should not persist")
    expect(ctx.repos.documents.listVersions(created.document.id)).toHaveLength(
      1
    )
    consoleError.mockRestore()
    ctx.cleanup()
  })

  it("rejects missing, ambiguous, inaccessible, and non-markdown section updates", () => {
    const ctx = createTestContext()
    const source = ctx.repos.threads.createWithInitialRun({
      title: "Source",
      prompt: "Create notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const other = ctx.repos.threads.createWithInitialRun({
      title: "Other",
      prompt: "Read notes",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Ambiguous",
      content: "# Notes\n\n## Repeat\n\nOne\n\n# Other\n\n## Repeat\n\nTwo",
      visibilityScope: "thread",
      threadId: source.thread.id,
      runId: source.run.id,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    expect(
      service.updateDocumentSection({
        documentId: created.document.id,
        sectionPath: "Missing",
        content: "Nope",
        runContext: { threadId: source.thread.id },
      })
    ).toMatchObject({ ok: false, code: "document_section_not_found" })
    expect(
      service.updateDocumentSection({
        documentId: created.document.id,
        sectionPath: "Repeat",
        content: "Nope",
        runContext: { threadId: source.thread.id },
      })
    ).toMatchObject({ ok: false, code: "document_section_ambiguous" })
    expect(
      service.readDocument({
        documentId: created.document.id,
        runContext: { threadId: other.thread.id },
      })
    ).toMatchObject({ ok: false, code: "document_not_accessible" })

    const upload = service.upload({
      title: "Image",
      documentType: "image",
      filename: "image.png",
      data: Buffer.from("png"),
      threadId: source.thread.id,
    })
    expect(upload).toMatchObject({ ok: true })
    if (!upload.ok) return
    expect(
      service.updateDocumentSection({
        documentId: upload.document.id,
        sectionPath: "Image",
        content: "Nope",
        runContext: { threadId: source.thread.id },
      })
    ).toMatchObject({ ok: false, code: "document_not_markdown" })
    ctx.cleanup()
  })

  it("returns workspace detail with selected and current versions", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Workspace doc",
      content: "# Version 1",
      visibilityScope: "global",
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    const updated = service.updateDocumentContent({
      documentId: created.document.id,
      content: "# Version 2",
      baseVersion: 1,
    })
    expect(updated).toMatchObject({ ok: true, currentVersion: 2 })

    const detail = service.getDocumentDetail({
      documentId: created.document.id,
      version: 1,
    })
    expect(detail).toMatchObject({
      ok: true,
      content: "# Version 1",
      selectedVersion: 1,
      currentVersion: 2,
      truncated: false,
    })
    ctx.cleanup()
  })

  it("rejects stale workspace content updates", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Conflict doc",
      content: "# Version 1",
      visibilityScope: "global",
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    expect(
      service.updateDocumentContent({
        documentId: created.document.id,
        content: "# Version 2",
        baseVersion: 1,
      })
    ).toMatchObject({ ok: true, currentVersion: 2 })

    expect(
      service.updateDocumentContent({
        documentId: created.document.id,
        content: "# Stale edit",
        baseVersion: 1,
      })
    ).toMatchObject({
      ok: false,
      code: "document_version_conflict",
      status: 409,
    })
    ctx.cleanup()
  })

  it("cleans up written content when version metadata update finds no document", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)
    const created = service.createMarkdownDocument({
      title: "Deleted doc",
      content: "# Version 1",
      visibilityScope: "global",
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    vi.spyOn(ctx.repos.documents, "updateWithVersion").mockReturnValueOnce(null)

    expect(
      service.updateDocumentContent({
        documentId: created.document.id,
        content: "# Version 2",
        baseVersion: 1,
      })
    ).toMatchObject({ ok: false, code: "document_not_found" })
    expect(
      existsSync(
        join(
          ctx.config.storageRoot,
          "documents",
          created.document.id,
          "versions",
          "2.md"
        )
      )
    ).toBe(false)
    ctx.cleanup()
  })

  it("treats duplicate next versions as workspace content conflicts", () => {
    const ctx = createTestContext()
    const service = new DocumentService(ctx.repos, ctx.config)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const created = service.createMarkdownDocument({
      title: "Race doc",
      content: "# Version 1",
      visibilityScope: "global",
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) return

    vi.spyOn(ctx.repos.documents, "updateWithVersion").mockImplementationOnce(
      () => {
        throw new Error(
          "UNIQUE constraint failed: document_versions.document_id, document_versions.version"
        )
      }
    )

    expect(
      service.updateDocumentContent({
        documentId: created.document.id,
        content: "# Version 2",
        baseVersion: 1,
      })
    ).toMatchObject({
      ok: false,
      code: "document_version_conflict",
      status: 409,
    })
    consoleError.mockRestore()
    ctx.cleanup()
  })
})
