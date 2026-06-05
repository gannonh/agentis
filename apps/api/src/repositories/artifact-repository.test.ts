import { describe, expect, it } from "vitest"
import { documents, documentVersions } from "../db/schema.js"
import { createTestContext } from "../test/setup.js"

describe("artifact repository", () => {
  it("exposes existing legacy markdown document rows as document artifacts with preserved provenance and versions", () => {
    const ctx = createTestContext()
    ctx.db
      .insert(documents)
      .values({
        id: "doc_legacy",
        title: "Legacy markdown",
        description: "Stored before artifact refactor",
        documentType: "markdown",
        contentFormat: "markdown",
        mimeType: "text/markdown",
        sizeBytes: 42,
        storageKey: "documents/doc_legacy/v1.md",
        previewText: "Legacy preview",
        metadataJson: JSON.stringify({ tags: ["legacy"] }),
        visibilityScope: "global",
        projectId: null,
        projectNameSnapshot: "Project One",
        threadId: null,
        threadTitleSnapshot: "Thread One",
        runId: null,
        agentId: "agent_1",
        agentNameSnapshot: "Agent One",
        currentVersionId: "version_1",
        currentVersion: 1,
        createdAt: "2026-06-04T00:00:00.000Z",
        updatedAt: "2026-06-04T00:01:00.000Z",
      })
      .run()
    ctx.db
      .insert(documentVersions)
      .values({
        id: "version_1",
        documentId: "doc_legacy",
        version: 1,
        contentHash: "hash_1",
        contentStorageKey: "documents/doc_legacy/v1.md",
        changeSummary: "Initial legacy version",
        createdByRunId: null,
        createdByThreadId: null,
        createdAt: "2026-06-04T00:00:00.000Z",
      })
      .run()

    const artifact = ctx.repos.artifacts.getById("doc_legacy")
    const versions = ctx.repos.artifacts.listVersions("doc_legacy")

    expect(artifact).toMatchObject({
      id: "doc_legacy",
      type: "document",
      contentFormat: "markdown",
      title: "Legacy markdown",
      storageKey: "documents/doc_legacy/v1.md",
      visibilityScope: "global",
      projectNameSnapshot: "Project One",
      threadTitleSnapshot: "Thread One",
      agentId: "agent_1",
      currentVersionId: "version_1",
      currentVersion: 1,
    })
    expect(versions).toEqual([
      expect.objectContaining({
        id: "version_1",
        artifactId: "doc_legacy",
        contentStorageKey: "documents/doc_legacy/v1.md",
        changeSummary: "Initial legacy version",
        createdByRunId: undefined,
        createdByThreadId: undefined,
      }),
    ])
    expect(ctx.repos.artifacts.list({ type: "document" })).toHaveLength(1)
    ctx.cleanup()
  })

  it("keeps document counts scoped to markdown-compatible rows", () => {
    const ctx = createTestContext()
    ctx.repos.documents.create({
      title: "Markdown brief",
      documentType: "document",
      mimeType: "text/markdown",
      sizeBytes: 18,
      storageKey: "documents/markdown/v1.md",
      visibilityScope: "global",
    })
    ctx.repos.artifacts.create({
      title: "Landing page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 20,
      storageKey: "artifacts/landing/index.html",
      visibilityScope: "global",
    })

    expect(ctx.repos.documents.count()).toBe(1)
    ctx.cleanup()
  })

  it("creates new markdown documents as document artifacts", () => {
    const ctx = createTestContext()

    const document = ctx.repos.documents.create({
      title: "Refactor notes",
      documentType: "document",
      mimeType: "text/markdown",
      sizeBytes: 18,
      storageKey: "documents/refactor-notes/v1.md",
      visibilityScope: "global",
    })

    const artifact = ctx.repos.artifacts.getById(document.id)

    expect(document).toMatchObject({
      id: document.id,
      type: "document",
      contentFormat: "markdown",
    })
    expect(artifact).toMatchObject({
      id: document.id,
      type: "document",
      contentFormat: "markdown",
      storageKey: "documents/refactor-notes/v1.md",
    })
    ctx.cleanup()
  })
})
