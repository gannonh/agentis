import { Hono } from "hono"
import { documentTypeSchema, listDocumentsQuerySchema } from "@workspace/shared"
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
      if (result.code === "document_too_large") {
        return c.json({ error: result.message, code: result.code }, 413)
      }
      return c.json({ error: result.message, code: result.code }, 500)
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
    const document = repos.documents.getById(documentId)
    if (!document) {
      return c.json(
        { error: "Document not found", code: "document_not_found" },
        404
      )
    }
    const content = documentService.getDownload(documentId)
    const previewContent = content.ok && document.mimeType.startsWith("text/")
      ? content.data.toString("utf8")
      : null
    return c.json({
      document: toPublicDocument(document),
      content: previewContent,
      versions: repos.documents.listVersions(documentId).map((version) => ({
        id: version.id,
        version: version.version,
        changeSummary: version.changeSummary,
        createdAt: version.createdAt,
      })),
    })
  })

  app.get("/:documentId/download", (c) => {
    const result = documentService.getDownload(c.req.param("documentId"))
    if (!result.ok) {
      const status = result.status === 404 ? 404 : (500 as const)
      return c.json({ error: result.message, code: result.code }, status)
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
