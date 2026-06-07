import { Hono } from "hono"
import {
  listArtifactsQuerySchema,
  staticArtifactMetadataSchema,
  updateAppStateRequestSchema,
  updateArtifactContentRequestSchema,
  updateArtifactVisibilityRequestSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { ArtifactService } from "../artifacts/artifact-service.js"
import { AppService } from "../artifact-apps/app-service.js"
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
    document_not_accessible: "artifact_not_accessible",
    document_not_markdown: "artifact_not_markdown",
    document_too_large: "artifact_too_large",
    document_version_conflict: "artifact_version_conflict",
    document_version_not_found: "artifact_version_not_found",
    document_content_required: "artifact_content_required",
    document_content_unchanged: "artifact_content_unchanged",
    document_storage_failed: "artifact_storage_failed",
    invalid_document_scope: "invalid_artifact_scope",
    invalid_document_provenance: "invalid_artifact_provenance",
  }
  const messageMap: Record<string, string> = {
    document_not_found: "Artifact not found",
    document_not_markdown:
      "Artifact content updates require a markdown document artifact",
  }
  return {
    error: messageMap[error.code] ?? error.message,
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

function truncateUtf8ToBytes(buffer: Buffer, maxBytes: number) {
  if (buffer.byteLength <= maxBytes) {
    return { text: buffer.toString("utf8"), truncated: false }
  }
  let end = maxBytes
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) {
    end -= 1
  }
  return { text: buffer.subarray(0, end).toString("utf8"), truncated: true }
}

function artifactDownloadFilename(input: { title: string; mimeType: string }) {
  const extensionByMimeType: Record<string, string> = {
    "text/markdown": ".md",
    "text/html": ".html",
    "application/json": ".json",
    "text/plain": ".txt",
    "text/csv": ".csv",
  }
  const extension = extensionByMimeType[input.mimeType] ?? ""
  const basename = input.title.replace(/[^\w.-]+/g, "_") || "artifact"
  if (!extension || basename.endsWith(extension)) return basename
  return `${basename}${extension}`
}

function staticArtifactMetadataCandidates(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown>[] {
  if (!metadata) return []
  const history = Array.isArray(metadata.versionHistory)
    ? metadata.versionHistory.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === "object" && entry !== null
      )
    : []
  return [metadata, ...history]
}

function selectedStaticArtifactMetadata(
  metadata: Record<string, unknown> | null | undefined,
  selectedVersion: number | null
): Record<string, unknown> | null | undefined {
  if (!metadata || !selectedVersion) return metadata
  const history = staticArtifactMetadataCandidates(metadata)
  return (
    history.find((entry) => entry.version === selectedVersion) ?? metadata
  )
}

function staticArtifactAsset(
  metadata: Record<string, unknown> | null | undefined,
  assetId: string
): { storageKey: string; mimeType: string } | null {
  const allowedImageMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ])
  for (const candidate of staticArtifactMetadataCandidates(metadata)) {
    const parsed = staticArtifactMetadataSchema.safeParse(candidate)
    if (!parsed.success) continue
    if (
      parsed.data.artifactType !== "slides" ||
      parsed.data.renderMode !== "polishedImage"
    ) {
      continue
    }
    const asset = parsed.data.assetReferences.find(
      (reference) => reference.assetId === assetId
    )
    if (!asset || !allowedImageMimeTypes.has(asset.mimeType)) continue
    return { storageKey: asset.storageKey, mimeType: asset.mimeType }
  }
  return null
}

export function createArtifactRoutes(repos: Repositories, config: AppConfig) {
  const app = new Hono()
  const storage = new LocalDocumentStorage(config)
  const artifactService = new ArtifactService(repos)
  const appService = new AppService(repos, config)
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

  app.get("/:artifactId/app-state", (c) => {
    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact || artifact.type !== "app") {
      return c.json(artifactNotFoundResponse(), 404)
    }
    const stored = repos.appState.get(artifact.id)
    return c.json({
      artifactId: artifact.id,
      state: stored?.state ?? null,
      updatedAt: stored?.updatedAt ?? null,
    })
  })

  app.put("/:artifactId/app-state", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = updateAppStateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", code: "invalid_request" },
        400
      )
    }
    const artifactId = c.req.param("artifactId")
    const result = appService.setState(artifactId, parsed.data.state)
    if (!result.ok) {
      return c.json(
        { error: result.message, code: result.code },
        (result.status ?? 500) as 400 | 404 | 413 | 500
      )
    }
    return c.json({
      artifactId,
      state: parsed.data.state,
      updatedAt: result.output.updatedAt,
    })
  })

  app.get("/:artifactId/assets/:assetId", (c) => {
    const artifact = repos.artifacts.getById(c.req.param("artifactId"))
    if (!artifact || (artifact.type !== "webpage" && artifact.type !== "slides")) {
      return c.json(artifactNotFoundResponse(), 404)
    }
    const asset = staticArtifactAsset(artifact.metadata, c.req.param("assetId"))
    if (!asset) {
      return c.json(
        {
          error: "Static artifact asset missing",
          code: "static_artifact_asset_missing",
        },
        404
      )
    }
    try {
      const data = storage.read(asset.storageKey)
      return new Response(data, {
        headers: {
          "content-type": asset.mimeType,
          "cache-control": "private, max-age=300",
        },
      })
    } catch {
      return c.json(
        {
          error: "Static artifact asset missing",
          code: "static_artifact_asset_missing",
        },
        404
      )
    }
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
          storage.readPrefix(storageKey, config.documentMaxUploadBytes + 1),
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

    const selectedMetadata = selectedStaticArtifactMetadata(
      artifact.metadata,
      selectedVersion
    )

    return c.json({
      artifact: toPublicArtifact({
        ...artifact,
        metadata: selectedMetadata ?? artifact.metadata,
      }),
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
      parsed.data.projectId,
      parsed.data.threadId
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
    const parsedVersion = versionFromQuery(c.req.query("version"))
    if (!parsedVersion.ok) {
      return c.json(
        { error: "Invalid version parameter", code: "invalid_request" },
        400
      )
    }
    const version = parsedVersion.version
      ? repos.artifacts
          .listVersions(artifact.id)
          .find((entry) => entry.version === parsedVersion.version)
      : undefined
    if (parsedVersion.version && !version) {
      return c.json(
        { error: "Artifact version not found", code: "artifact_version_not_found" },
        404
      )
    }
    const storageKey = version?.contentStorageKey ?? artifact.storageKey
    let data: Buffer
    try {
      data = storage.read(storageKey)
    } catch (error) {
      return c.json(
        { error: "Artifact content missing", code: "artifact_blob_missing" },
        404
      )
    }
    const filename = artifactDownloadFilename(artifact)
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
