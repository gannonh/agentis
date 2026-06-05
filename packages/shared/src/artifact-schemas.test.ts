import { describe, expect, it } from "vitest"
import {
  artifactDetailResponseSchema,
  artifactPublicSchema,
  artifactSchema,
  artifactTypeSchema,
  artifactVersionSchema,
  documentSchema,
  documentTypeSchema,
  listArtifactsQuerySchema,
  updateArtifactContentRequestSchema,
  updateArtifactContentResponseSchema,
  updateArtifactVisibilityRequestSchema,
  updateArtifactVisibilityResponseSchema,
} from "./schemas.js"

describe("artifact schemas", () => {
  const now = new Date().toISOString()

  const artifact = {
    id: "artifact-1",
    type: "webpage" as const,
    title: "Campaign landing page",
    description: null,
    contentFormat: "html" as const,
    mimeType: "text/html",
    sizeBytes: 128,
    storageKey: "artifacts/artifact-1/v1/index.html",
    previewText: "Landing page preview",
    metadata: { renderMode: "html" },
    visibilityScope: "project" as const,
    projectId: "project-1",
    projectNameSnapshot: "Launch",
    threadId: null,
    threadTitleSnapshot: null,
    runId: "run-1",
    agentId: "agent-1",
    agentNameSnapshot: "Research Agent",
    currentVersionId: "version-1",
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
  }

  it("parses shared Library fields on artifact records", () => {
    const parsed = artifactSchema.parse(artifact)

    expect(parsed.type).toBe("webpage")
    expect(parsed.contentFormat).toBe("html")
    expect(parsed.visibilityScope).toBe("project")
  })

  it("omits internal storage keys from public artifact responses", () => {
    const parsed = artifactPublicSchema.parse(artifact)

    expect(parsed).not.toHaveProperty("storageKey")
    expect(parsed.type).toBe("webpage")
  })

  it("requires scope anchors for thread and project artifacts", () => {
    expect(() =>
      artifactSchema.parse({
        ...artifact,
        visibilityScope: "thread",
        threadId: null,
        projectId: null,
      })
    ).toThrow()
    expect(() =>
      artifactSchema.parse({
        ...artifact,
        visibilityScope: "project",
        projectId: null,
      })
    ).toThrow()
  })

  it("exposes artifact type siblings for documents, webpages, slides, and future outputs", () => {
    expect(artifactTypeSchema.options).toEqual([
      "document",
      "webpage",
      "slides",
      "hyperapp",
      "table",
      "image",
      "video",
      "other",
    ])
  })

  it("parses artifact versions and detail responses", () => {
    const version = artifactVersionSchema.parse({
      id: "version-1",
      artifactId: artifact.id,
      version: 1,
      contentHash: "hash-1",
      contentStorageKey: "artifacts/artifact-1/v1/index.html",
      changeSummary: "Initial version",
      createdByRunId: "run-1",
      createdByThreadId: "thread-1",
      createdAt: now,
    })
    const detail = artifactDetailResponseSchema.parse({
      artifact,
      content: "<main>Hello</main>",
      truncated: false,
      selectedVersion: 1,
      currentVersion: 1,
      versions: [version],
    })

    expect(detail.artifact.type).toBe("webpage")
    expect(detail.versions[0]?.version).toBe(1)
  })

  it("parses artifact list and update DTOs", () => {
    expect(
      listArtifactsQuerySchema.parse({
        query: "launch",
        type: "slides",
        visibilityScope: "project",
        projectId: "project-1",
        source: "agent",
        agentId: "agent-1",
      }).type
    ).toBe("slides")
    expect(
      updateArtifactContentRequestSchema.parse({
        content: "# Updated",
        baseVersion: 1,
        changeSummary: "Refresh content",
      }).baseVersion
    ).toBe(1)
    expect(
      updateArtifactContentResponseSchema.parse({
        artifact,
        currentVersion: 2,
      }).currentVersion
    ).toBe(2)
    expect(
      updateArtifactVisibilityRequestSchema.parse({
        visibilityScope: "global",
      }).visibilityScope
    ).toBe("global")
    expect(
      updateArtifactVisibilityResponseSchema.parse({
        artifact,
        previousVisibilityScope: "project",
      }).previousVisibilityScope
    ).toBe("project")
  })

  it("narrows markdown Document schemas to document artifacts with markdown content", () => {
    const document = documentSchema.parse({
      ...artifact,
      id: "document-1",
      type: "document",
      contentFormat: "markdown",
      mimeType: "text/markdown",
      storageKey: "artifacts/document-1/v1/content.md",
      visibilityScope: "global",
      projectId: null,
    })

    expect(document.type).toBe("document")
    expect(document.contentFormat).toBe("markdown")
    expect(documentTypeSchema.parse("document")).toBe("document")
    expect(() => documentSchema.parse({ ...document, type: "webpage" })).toThrow()
    expect(() => documentSchema.parse({ ...document, contentFormat: "html" })).toThrow()
    expect(() => documentTypeSchema.parse("webpage")).toThrow()
    expect(() => documentTypeSchema.parse("slides")).toThrow()
  })
})
