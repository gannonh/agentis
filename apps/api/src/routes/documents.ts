import { Hono } from "hono"
import {
  documentTypeSchema,
  listDocumentsQuerySchema,
  updateDocumentContentRequestSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { DocumentService } from "../documents/document-service.js"
import { toPublicDocument } from "../lib/public-documents.js"

export function createDocumentRoutes(repos: Repositories, config: AppConfig) {
  const app = new Hono()
  const documentService = new DocumentService(repos, config)

  app.get("/", (c) => {
    const parsed = listDocumentsQuerySchema.safeParse({
      query: c.req.query("query"),
      documentType: c.req.query("documentType"),
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
    const documents = repos.documents.list(parsed.data)
    return c.json(documents.map((document) => toPublicDocument(document)))
  })

  app.post("/", async (c) => {
    const body = await c.req.parseBody()
    const file = body.file
    const title = typeof body.title === "string" ? body.title : ""
    const documentTypeRaw =
      typeof body.documentType === "string" ? body.documentType : "other"
    const description =
      typeof body.description === "string" ? body.description : undefined
    const projectId =
      typeof body.projectId === "string" ? body.projectId : undefined
    const threadId =
      typeof body.threadId === "string" ? body.threadId : undefined

    if (!title.trim()) {
      return c.json(
        { error: "Title is required", code: "invalid_request" },
        400
      )
    }

    const parsedType = documentTypeSchema.safeParse(documentTypeRaw)
    if (!parsedType.success) {
      return c.json(
        { error: "Invalid document type", code: "invalid_request" },
        400
      )
    }

    let data: Buffer
    let filename = "upload.bin"
    if (file instanceof File) {
      if (file.size > config.documentMaxUploadBytes) {
        return c.json(
          {
            error: "Document exceeds maximum upload size",
            code: "document_too_large",
          },
          413
        )
      }
      data = Buffer.from(await file.arrayBuffer())
      filename = file.name || filename
    } else if (typeof file === "string") {
      if (Buffer.byteLength(file, "utf8") > config.documentMaxUploadBytes) {
        return c.json(
          {
            error: "Document exceeds maximum upload size",
            code: "document_too_large",
          },
          413
        )
      }
      data = Buffer.from(file, "utf8")
      filename = "upload.txt"
    } else {
      return c.json({ error: "File is required", code: "invalid_request" }, 400)
    }

    const result = documentService.upload({
      title: title.trim(),
      description,
      documentType: parsedType.data,
      filename,
      mimeType: file instanceof File ? file.type : undefined,
      data,
      projectId,
      threadId,
    })

    if (!result.ok) {
      return c.json(
        { error: result.message, code: result.code },
        (result.status ?? 500) as 400 | 413 | 500
      )
    }

    return c.json(toPublicDocument(result.document), 201)
  })

  app.get("/:documentId", (c) => {
    const document = repos.documents.getById(c.req.param("documentId"))
    if (!document) {
      return c.json(
        { error: "Document not found", code: "document_not_found" },
        404
      )
    }
    return c.json(toPublicDocument(document))
  })

  app.get("/:documentId/detail", (c) => {
    const documentId = c.req.param("documentId")
    const versionRaw = c.req.query("version")
    const version =
      versionRaw && versionRaw.trim()
        ? Number.parseInt(versionRaw, 10)
        : undefined
    if (versionRaw && (!Number.isInteger(version) || version! < 1)) {
      return c.json(
        { error: "Invalid version parameter", code: "invalid_request" },
        400
      )
    }

    const result = documentService.getDocumentDetail({
      documentId,
      version,
    })
    if (!result.ok) {
      return c.json(
        { error: result.message, code: result.code },
        (result.status ?? 500) as 400 | 404 | 500
      )
    }

    return c.json({
      document: toPublicDocument(result.document),
      content: result.content,
      truncated: result.truncated,
      selectedVersion: result.selectedVersion,
      currentVersion: result.currentVersion,
      versions: result.versions.map((entry) => ({
        id: entry.id,
        version: entry.version,
        changeSummary: entry.changeSummary,
        createdAt: entry.createdAt,
      })),
    })
  })

  app.patch("/:documentId/content", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = updateDocumentContentRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", code: "invalid_request" },
        400
      )
    }

    const result = documentService.updateDocumentContent({
      documentId: c.req.param("documentId"),
      content: parsed.data.content,
      baseVersion: parsed.data.baseVersion,
      changeSummary: parsed.data.changeSummary,
    })
    if (!result.ok) {
      return c.json(
        { error: result.message, code: result.code },
        (result.status ?? 500) as 400 | 404 | 409 | 413 | 500
      )
    }

    return c.json({
      document: toPublicDocument(result.document),
      currentVersion: result.currentVersion,
    })
  })

  app.get("/:documentId/download", (c) => {
    const result = documentService.getDownload(c.req.param("documentId"))
    if (!result.ok) {
      return c.json(
        { error: result.message, code: result.code },
        (result.status ?? 500) as 404 | 500
      )
    }
    const filename =
      result.document.title.replace(/[^\w.-]+/g, "_") || "document"
    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Type": result.document.mimeType,
        "Content-Length": String(result.data.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  })

  return app
}
