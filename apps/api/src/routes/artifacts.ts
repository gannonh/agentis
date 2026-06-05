import { Hono } from "hono"
import {
  listArtifactsQuerySchema,
  updateArtifactContentRequestSchema,
  updateArtifactVisibilityRequestSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { ArtifactService } from "../artifacts/artifact-service.js"
import { DocumentService } from "../documents/document-service.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"
import { toPublicArtifact } from "../lib/public-artifacts.js"
import type { Repositories } from "../repositories/index.js"

function artifactNotFoundResponse() {
  return { error: "Artifact not found", code: "artifact_not_found" }
}

function artifactNotMarkdownResponse() {
  return {
    error: "Artifact content updates require a markdown document artifact",
    code: "artifact_not_markdown",
  }
}

function artifactRouteError(error: { code: string; message: string }) {
  const codeMap: Record<string, string> = {
    document_not_found: "artifact_not_found",
    document_not_markdown: "artifact_not_markdown",
    document_too_large: "artifact_too_large",
    document_version_conflict: "artifact_version_conflict",
    invalid_document_scope: "invalid_artifact_scope",
    invalid_document_provenance: "invalid_artifact_provenance",
  }
  const messageMap: Record<string, string> = {
    document_not_found: "Artifact not found",
    document_not_markdown:
      "Artifact content updates require a markdown document artifact",
  }
  return {
    error:
      messageMap[error.code] ??
      error.message.replace(/Document/g, "Artifact").replace(/document/g, "artifact"),
    code: codeMap[error.code] ?? error.code,
  }
}

function versionFromQuery(value: string | undefined) {
  if (!value?.trim()) return { ok: true as const, version: undefined }
  const version = Number(value)
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false as const }
  }
  return { ok: true as const, version }
}

function isTextPreviewFormat(contentFormat: string) {
  return ["markdown", "text", "html", "json", "manifest"].includes(
    contentFormat
  )
}

function truncateUtf8ToBytes(text: string, maxBytes: number) {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) {
    return { text, truncated: false }
  }
  let end = text.length
  while (end > 0 && Buffer.byteLength(text.slice(0, end), "utf8") > maxBytes) {
    end -= 1
  }
  return { text: text.slice(0, end), truncated: true }
}

export function createArtifactRoutes(repos: Repositories, config: AppConfig) {
  const app = new Hono()
  const storage = new LocalDocumentStorage(config)
  const artifactService = new ArtifactService(repos)
  const documentService = new DocumentService(repos, config)

  app.get("/", (c) => {
    const parsed = listArtifactsQuerySchema.safeParse({
      query: c.req.query("query"),
      type: c.req.query("type"),
      visibilityScope: c.req.query("visibilityScope"),
      projectId: c.req.query("projectId"),
      threadId: c.req.query("threadId"),
      source: c.req.query("source"),
      agentId: c.req.query("agentId"),
    })
    if (!parsed.success) {
      return c.json(
        { error: "Invalid query parameters", code: "invalid_request" },
        400
      )
    }
    return c.json(
      repos.artifacts
        .list(parsed.data)
        .map((artifact) => toPublicArtifact(artifact))
    )
  })

  app.get("/:artifactId", (c) => {
    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact) {
      return c.json(artifactNotFoundResponse(), 404)
    }
    return c.json(toPublicArtifact(artifact))
  })

  app.get("/:artifactId/detail", (c) => {
    const artifactId = c.req.param("artifactId")
    const artifact = repos.artifacts.getById(artifactId)
    if (!artifact) {
      return c.json(artifactNotFoundResponse(), 404)
    }

    const parsedVersion = versionFromQuery(c.req.query("version"))
    if (!parsedVersion.ok) {
      return c.json(
        { error: "Invalid version parameter", code: "invalid_request" },
        400
      )
    }

    const versions = repos.artifacts.listVersions(artifact.id)
    const selectedVersion = parsedVersion.version ?? artifact.currentVersion ?? null
    if (
      parsedVersion.version &&
      !versions.some((version) => version.version === parsedVersion.version)
    ) {
      return c.json(
        { error: "Artifact version not found", code: "artifact_version_not_found" },
        404
      )
    }
    const version = selectedVersion
      ? versions.find((entry) => entry.version === selectedVersion)
      : undefined
    const storageKey = version?.contentStorageKey ?? artifact.storageKey
    let content: string | null = null
    let truncated = false
    if (isTextPreviewFormat(artifact.contentFormat)) {
      try {
        const limited = truncateUtf8ToBytes(
          storage.read(storageKey).toString("utf8"),
          config.documentMaxUploadBytes
        )
        content = limited.text
        truncated = limited.truncated
      } catch (error) {
        return c.json(
          { error: "Artifact content missing", code: "artifact_blob_missing" },
          404
        )
      }
    }

    return c.json({
      artifact: toPublicArtifact(artifact),
      content,
      truncated,
      selectedVersion,
      currentVersion: artifact.currentVersion ?? null,
      versions: versions.map((entry) => ({
        id: entry.id,
        version: entry.version,
        changeSummary: entry.changeSummary,
        createdAt: entry.createdAt,
      })),
    })
  })

  app.patch("/:artifactId/content", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = updateArtifactContentRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", code: "invalid_request" },
        400
      )
    }

    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact) {
      return c.json(artifactNotFoundResponse(), 404)
    }
    if (artifact.type !== "document" || artifact.contentFormat !== "markdown") {
      return c.json(artifactNotMarkdownResponse(), 400)
    }

    const result = documentService.updateDocumentContent({
      documentId: artifact.id,
      content: parsed.data.content,
      baseVersion: parsed.data.baseVersion,
      changeSummary: parsed.data.changeSummary,
    })
    if (!result.ok) {
      return c.json(
        artifactRouteError(result),
        (result.status ?? 500) as 400 | 404 | 409 | 413 | 500
      )
    }
    return c.json({
      artifact: toPublicArtifact(result.document),
      currentVersion: result.currentVersion,
    })
  })

  app.patch("/:artifactId/visibility", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = updateArtifactVisibilityRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", code: "invalid_request" },
        400
      )
    }

    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact) {
      return c.json(artifactNotFoundResponse(), 404)
    }

    const projectScopeChanged =
      parsed.data.visibilityScope === "project" &&
      parsed.data.projectId &&
      parsed.data.projectId !== artifact.projectId
    if (
      artifact.visibilityScope === parsed.data.visibilityScope &&
      !projectScopeChanged
    ) {
      return c.json(
        {
          error: "Artifact already uses this visibility scope",
          code: "artifact_scope_unchanged",
        },
        400
      )
    }

    const assignment = artifactService.resolveVisibilityScopeAssignment(
      artifact,
      parsed.data.visibilityScope,
      undefined,
      parsed.data.projectId
    )
    if (!assignment.ok) {
      return c.json(
        artifactRouteError(assignment),
        (assignment.status ?? 500) as 400 | 403 | 404 | 500
      )
    }

    const updated = repos.artifacts.updateVisibilityScope({
      artifactId: artifact.id,
      visibilityScope: parsed.data.visibilityScope,
      projectId: assignment.projectId,
      projectNameSnapshot: assignment.projectNameSnapshot,
      threadId: assignment.threadId,
      threadTitleSnapshot: assignment.threadTitleSnapshot,
    })
    if (!updated) {
      return c.json(artifactNotFoundResponse(), 404)
    }

    return c.json({
      artifact: toPublicArtifact(updated),
      previousVisibilityScope: artifact.visibilityScope,
    })
  })

  app.get("/:artifactId/download", (c) => {
    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact) {
      return c.json(artifactNotFoundResponse(), 404)
    }
    let data: Buffer
    try {
      data = storage.read(artifact.storageKey)
    } catch (error) {
      return c.json(
        { error: "Artifact content missing", code: "artifact_blob_missing" },
        404
      )
    }
    const filename = artifact.title.replace(/[^\w.-]+/g, "_") || "artifact"
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": artifact.mimeType,
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  })

  return app
}
