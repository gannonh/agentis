import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { DocumentService } from "./document-service.js"

describe("DocumentService", () => {
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
          runContext: { threadId: outside.thread.id, projectId: otherProject.id },
        })
        .map((document) => document.title)
    ).toEqual(["Global shared"])
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
    expect(updated).toMatchObject({ ok: true, previousVersion: 1, currentVersion: 2 })

    const appended = service.appendDocumentSection({
      documentId: created.document.id,
      parentSectionPath: "Playbook",
      heading: "Follow-up",
      content: "Follow-up notes",
      changeSummary: "Add follow-up",
      runContext: { threadId: createdThread.thread.id },
    })
    expect(appended).toMatchObject({ ok: true, previousVersion: 2, currentVersion: 3 })

    const read = service.readDocument({
      documentId: created.document.id,
      runContext: { threadId: createdThread.thread.id },
    })
    expect(read).toMatchObject({ ok: true, currentVersion: 3 })
    if (!read.ok) return
    expect(read.content).toContain("## Steps\n\nNew steps")
    expect(read.content).toContain("## Follow-up\n\nFollow-up notes")
    expect(ctx.repos.documents.listVersions(created.document.id)).toHaveLength(3)
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
})
