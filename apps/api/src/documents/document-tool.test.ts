import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { buildDocumentTools } from "./document-tool.js"
import { DocumentService } from "./document-service.js"

async function executeTool<TInput>(
  tool: unknown,
  input: TInput
): Promise<unknown> {
  const executable = tool as { execute: (input: TInput) => Promise<unknown> }
  return executable.execute(input)
}

describe("document runtime tools", () => {
  it("binds document access to run context and emits evidence", async () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Runtime docs" })
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Runtime thread",
      prompt: "Create docs",
      model: "gpt-4o-mini",
      mode: "agent",
      projectId: project.id,
    })
    const otherThread = ctx.repos.threads.createWithInitialRun({
      title: "Other thread",
      prompt: "Read docs",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const evidence: Array<{ title: string; payload: Record<string, unknown> }> = []
    const service = new DocumentService(ctx.repos, ctx.config)
    const tools = buildDocumentTools(service, {
      runId: createdThread.run.id,
      threadId: createdThread.thread.id,
      projectId: project.id,
      onEvidence: (title, payload) => evidence.push({ title, payload }),
    })

    const created = await executeTool(tools.createDocument, {
      title: "Runtime playbook",
      content: "# Runtime playbook\n\n## Steps\n\nDo this",
      visibilityScope: "project",
    })
    expect(created).toMatchObject({
      title: "Runtime playbook",
      visibilityScope: "project",
      currentVersion: 1,
    })
    const documentId = (created as { documentId: string }).documentId
    expect(created).toMatchObject({
      viewPath: `/documents/${documentId}`,
      downloadPath: `/api/documents/${documentId}/download`,
    })

    const otherService = new DocumentService(ctx.repos, ctx.config)
    const otherTools = buildDocumentTools(otherService, {
      runId: otherThread.run.id,
      threadId: otherThread.thread.id,
    })
    const inaccessible = await executeTool(otherTools.readDocument, {
      documentId,
      runContext: { projectId: project.id },
    })
    expect(inaccessible).toEqual({
      error: "Document is not accessible from this run",
      code: "document_not_accessible",
    })

    const found = await executeTool(tools.findDocuments, {
      query: "Runtime",
      limit: 5,
      runContext: { projectId: "model-cannot-override" },
    })
    expect(found).toMatchObject({
      results: [
        {
          id: documentId,
          title: "Runtime playbook",
          visibilityScope: "project",
          viewPath: `/documents/${documentId}`,
          downloadPath: `/api/documents/${documentId}/download`,
        },
      ],
    })

    const updated = await executeTool(tools.updateDocumentSection, {
      documentId,
      sectionPath: "Runtime playbook > Steps",
      content: "Do this next",
    })
    expect(updated).toMatchObject({
      documentId,
      previousVersion: 1,
      currentVersion: 2,
      sectionPath: "Runtime playbook > Steps",
      viewPath: `/documents/${documentId}`,
      downloadPath: `/api/documents/${documentId}/download`,
    })

    const appended = await executeTool(tools.appendDocumentSection, {
      documentId,
      heading: "Risks",
      content: "Watch scope",
    })
    expect(appended).toMatchObject({
      documentId,
      previousVersion: 2,
      currentVersion: 3,
      sectionPath: "Risks",
      viewPath: `/documents/${documentId}`,
      downloadPath: `/api/documents/${documentId}/download`,
    })

    const read = await executeTool(tools.readDocument, { documentId })
    expect(read).toMatchObject({
      metadata: {
        id: documentId,
        currentVersion: 3,
        viewPath: `/documents/${documentId}`,
        downloadPath: `/api/documents/${documentId}/download`,
      },
      truncated: false,
      sectionOutline: expect.arrayContaining([
        { heading: "Steps", level: 2, path: "Runtime playbook > Steps" },
        { heading: "Risks", level: 1, path: "Risks" },
      ]),
    })
    expect(evidence.map((entry) => entry.title)).toEqual([
      "Document created: Runtime playbook",
      "Searched documents",
      "Updated document section: Runtime playbook",
      "Appended document section: Runtime playbook",
      "Read document: Runtime playbook",
    ])
    ctx.cleanup()
  })

  it("surfaces validation errors from document creation", async () => {
    const ctx = createTestContext()
    const createdThread = ctx.repos.threads.createWithInitialRun({
      title: "Runtime thread",
      prompt: "Create docs",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const tools = buildDocumentTools(new DocumentService(ctx.repos, ctx.config), {
      runId: createdThread.run.id,
      threadId: createdThread.thread.id,
    })

    await expect(
      executeTool(tools.createDocument, {
        title: "Project orphan",
        content: "# Orphan",
        visibilityScope: "project",
      })
    ).resolves.toEqual({
      error: "Project-scoped documents require a project",
      code: "invalid_document_scope",
    })
    ctx.cleanup()
  })
})
