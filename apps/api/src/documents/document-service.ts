import { createHash } from "node:crypto"
import { extname } from "node:path"
import type {
  Document,
  DocumentType,
  DocumentVisibilityScope,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { LocalDocumentStorage } from "./local-document-storage.js"
import {
  appendMarkdownSection,
  parseMarkdownSections,
  replaceMarkdownSectionContent,
  type MarkdownSection,
} from "./markdown-sections.js"

export type DocumentRunContext = {
  threadId?: string
  projectId?: string
  runId?: string
}

type DocumentProvenance = {
  threadId?: string
  projectNameSnapshot?: string
  threadTitleSnapshot?: string
  agentId?: string
  agentNameSnapshot?: string
}

type DocumentResult<T> = { ok: true } & T
type DocumentError = { ok: false; code: string; message: string; status?: number }

function inferMimeType(filename: string, fallback?: string) {
  if (fallback?.trim()) return fallback
  const ext = extname(filename).toLowerCase()
  switch (ext) {
    case ".md":
      return "text/markdown"
    case ".txt":
      return "text/plain"
    case ".html":
      return "text/html"
    case ".json":
      return "application/json"
    case ".pdf":
      return "application/pdf"
    default:
      return "application/octet-stream"
  }
}

function buildPreviewText(content: string, maxChars: number) {
  const trimmed = content.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}…`
}

function contentHash(content: Buffer | string) {
  return createHash("sha256").update(content).digest("hex")
}

function contentFormatFor(documentType: DocumentType, mimeType: string) {
  if (documentType === "markdown") return "markdown"
  if (mimeType.startsWith("text/")) return "text"
  return "binary"
}

function currentVersion(document: Document) {
  return document.currentVersion ?? 0
}

export class DocumentService {
  private readonly storage: LocalDocumentStorage

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {
    this.storage = new LocalDocumentStorage(config)
  }

  createMarkdownDocument(input: {
    title: string
    description?: string
    content: string
    visibilityScope: DocumentVisibilityScope
    projectId?: string
    threadId?: string
    runId?: string
    tags?: string[]
    changeSummary?: string
  }): DocumentResult<{ document: Document; currentVersion: number }> | DocumentError {
    if (!input.content.trim()) {
      return {
        ok: false,
        code: "document_too_large",
        message: "Document content is required",
        status: 400,
      }
    }
    const data = Buffer.from(input.content, "utf8")
    if (data.byteLength > this.config.documentMaxUploadBytes) {
      return {
        ok: false,
        code: "document_too_large",
        message: "Document exceeds maximum size",
        status: 413,
      }
    }

    const provenanceResult = this.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
    })
    if (!provenanceResult.ok) return provenanceResult

    const storageKey = this.storage.createStorageKey(`${input.title}.md`)
    try {
      this.storage.write(storageKey, data)
    } catch {
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to store document content",
        status: 500,
      }
    }

    try {
      const document = this.repos.documents.create({
        title: input.title,
        description: input.description,
        documentType: "markdown",
        contentFormat: "markdown",
        mimeType: "text/markdown",
        sizeBytes: data.byteLength,
        storageKey,
        previewText: buildPreviewText(input.content, this.config.documentPreviewMaxChars),
        metadata: input.tags?.length ? { tags: input.tags } : undefined,
        visibilityScope: input.visibilityScope,
        projectId: input.projectId,
        runId: input.runId,
        ...provenanceResult.provenance,
      })
      const versionStorageKey = this.storage.createVersionStorageKey(document.id, 1)
      this.storage.write(versionStorageKey, data)
      const version = this.repos.documents.createVersion({
        documentId: document.id,
        version: 1,
        contentHash: contentHash(data),
        contentStorageKey: versionStorageKey,
        changeSummary: input.changeSummary ?? "Created document",
        createdByRunId: input.runId,
        createdByThreadId: provenanceResult.provenance.threadId,
      })
      const updated = this.repos.documents.updateCurrentVersion({
        documentId: document.id,
        versionId: version.id,
        version: 1,
        storageKey,
        sizeBytes: data.byteLength,
        previewText: buildPreviewText(input.content, this.config.documentPreviewMaxChars),
      })
      return { ok: true, document: updated ?? document, currentVersion: 1 }
    } catch {
      this.storage.delete(storageKey)
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to persist document metadata",
        status: 500,
      }
    }
  }

  registerGenerated(input: {
    title: string
    description?: string
    filename?: string
    content: string
    visibilityScope?: DocumentVisibilityScope
    projectId?: string
    threadId?: string
    runId?: string
    changeSummary?: string
  }) {
    return this.createMarkdownDocument({
      title: input.title,
      description: input.description,
      content: input.content,
      visibilityScope: input.visibilityScope ?? (input.projectId ? "project" : "thread"),
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
      changeSummary: input.changeSummary,
    })
  }

  upload(input: {
    title: string
    description?: string
    documentType: DocumentType
    filename: string
    mimeType?: string
    data: Buffer
    previewText?: string
    projectId?: string
    threadId?: string
  }): DocumentResult<{ document: Document }> | DocumentError {
    if (input.data.byteLength > this.config.documentMaxUploadBytes) {
      return {
        ok: false,
        code: "document_too_large",
        message: "Document exceeds maximum upload size",
        status: 413,
      }
    }
    const provenanceResult = this.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
    })
    if (!provenanceResult.ok) return provenanceResult

    const storageKey = this.storage.createStorageKey(input.filename)
    try {
      this.storage.write(storageKey, input.data)
    } catch {
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to store document file",
        status: 500,
      }
    }

    const mimeType = inferMimeType(input.filename, input.mimeType)
    const textContent = mimeType.startsWith("text/")
      ? input.data.toString("utf8")
      : ""
    try {
      const document = this.repos.documents.create({
        title: input.title,
        description: input.description,
        documentType: input.documentType,
        contentFormat: contentFormatFor(input.documentType, mimeType),
        mimeType,
        sizeBytes: input.data.byteLength,
        storageKey,
        previewText:
          input.previewText ??
          buildPreviewText(textContent, this.config.documentPreviewMaxChars),
        visibilityScope: input.projectId ? "project" : "thread",
        projectId: input.projectId,
        ...provenanceResult.provenance,
      })
      return { ok: true, document }
    } catch {
      this.storage.delete(storageKey)
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to persist document metadata",
        status: 500,
      }
    }
  }

  findDocuments(input: {
    query?: string
    visibilityScope?: DocumentVisibilityScope
    documentType?: DocumentType
    projectId?: string
    limit?: number
    runContext: DocumentRunContext
  }): Document[] {
    const limit = Math.max(1, Math.min(input.limit ?? 20, 50))
    return this.repos.documents
      .list({
        query: input.query,
        visibilityScope: input.visibilityScope,
        documentType: input.documentType,
        projectId: input.projectId,
      })
      .filter((document) => this.canAccess(document, input.runContext))
      .sort((left, right) => {
        const scopeOrder = { global: 0, project: 1, thread: 2 }
        return scopeOrder[left.visibilityScope] - scopeOrder[right.visibilityScope]
      })
      .slice(0, limit)
  }

  readDocument(input: {
    documentId: string
    version?: number
    maxChars?: number
    runContext: DocumentRunContext
  }):
    | DocumentResult<{
        document: Document
        content: string
        truncated: boolean
        maxChars: number
        outline: MarkdownSection[]
        currentVersion: number
      }>
    | DocumentError {
    const document = this.repos.documents.getById(input.documentId)
    if (!document) {
      return { ok: false, code: "document_not_found", message: "Document not found", status: 404 }
    }
    if (!this.canAccess(document, input.runContext)) {
      return {
        ok: false,
        code: "document_not_accessible",
        message: "Document is not accessible from this run",
        status: 403,
      }
    }

    const version = input.version
      ? this.repos.documents.getVersion(document.id, input.version)
      : document.currentVersion
        ? this.repos.documents.getVersion(document.id, document.currentVersion)
        : null
    if (input.version && !version) {
      return {
        ok: false,
        code: "document_version_not_found",
        message: "Document version not found",
        status: 404,
      }
    }
    const storageKey = version?.contentStorageKey ?? document.storageKey
    let content: string
    try {
      content = this.storage.read(storageKey).toString("utf8")
    } catch {
      return {
        ok: false,
        code: "document_blob_missing",
        message: "Stored document content is missing",
        status: 404,
      }
    }

    const maxChars = input.maxChars ?? 32_000
    const truncated = content.length > maxChars
    const bounded = truncated ? content.slice(0, maxChars) : content
    return {
      ok: true,
      document,
      content: bounded,
      truncated,
      maxChars,
      outline: document.documentType === "markdown" ? parseMarkdownSections(content) : [],
      currentVersion: currentVersion(document),
    }
  }

  updateDocumentSection(input: {
    documentId: string
    sectionPath: string
    content: string
    changeSummary?: string
    runContext: DocumentRunContext
  }): DocumentResult<{ document: Document; previousVersion: number; currentVersion: number; section: MarkdownSection }> | DocumentError {
    return this.changeMarkdownDocument(input, (content) => {
      const section = this.findSection(content, input.sectionPath)
      if (!section.ok) return section
      return {
        ok: true,
        content: replaceMarkdownSectionContent(content, section.section, input.content),
        section: section.section,
      }
    })
  }

  appendDocumentSection(input: {
    documentId: string
    parentSectionPath?: string
    heading?: string
    content: string
    changeSummary?: string
    runContext: DocumentRunContext
  }): DocumentResult<{ document: Document; previousVersion: number; currentVersion: number; section: MarkdownSection }> | DocumentError {
    return this.changeMarkdownDocument(input, (content) => {
      let parent: MarkdownSection | undefined
      if (input.parentSectionPath) {
        const parentResult = this.findSection(content, input.parentSectionPath)
        if (!parentResult.ok) return parentResult
        parent = parentResult.section
      }
      const nextContent = appendMarkdownSection({
        markdown: content,
        parent,
        heading: input.heading,
        content: input.content,
      })
      const outline = parseMarkdownSections(nextContent)
      const section = input.heading
        ? outline.find((entry) => entry.heading === input.heading?.trim()) ??
          outline[outline.length - 1]
        : parent ?? outline[outline.length - 1]
      if (!section) {
        return {
          ok: false,
          code: "document_section_not_found",
          message: "Document section not found",
          status: 404,
        }
      }
      return { ok: true, content: nextContent, section }
    })
  }

  getDownload(documentId: string):
    | DocumentResult<{ document: Document; data: Buffer }>
    | DocumentError {
    const document = this.repos.documents.getById(documentId)
    if (!document) {
      return { ok: false, code: "document_not_found", message: "Document not found", status: 404 }
    }
    try {
      return { ok: true, document, data: this.storage.read(document.storageKey) }
    } catch {
      return {
        ok: false,
        code: "document_blob_missing",
        message: "Stored document content is missing",
        status: 404,
      }
    }
  }

  private changeMarkdownDocument(
    input: {
      documentId: string
      content: string
      changeSummary?: string
      runContext: DocumentRunContext
    },
    change: (
      content: string
    ) =>
      | DocumentResult<{ content: string; section: MarkdownSection }>
      | DocumentError
  ): DocumentResult<{ document: Document; previousVersion: number; currentVersion: number; section: MarkdownSection }> | DocumentError {
    const read = this.readDocument({
      documentId: input.documentId,
      maxChars: this.config.documentMaxUploadBytes,
      runContext: input.runContext,
    })
    if (!read.ok) return read
    if (read.document.documentType !== "markdown") {
      return {
        ok: false,
        code: "document_not_markdown",
        message: "Document is not markdown",
        status: 400,
      }
    }
    const changed = change(read.content)
    if (!changed.ok) return changed
    const data = Buffer.from(changed.content, "utf8")
    if (data.byteLength > this.config.documentMaxUploadBytes) {
      return {
        ok: false,
        code: "document_too_large",
        message: "Document exceeds maximum size",
        status: 413,
      }
    }

    const previousVersion = read.currentVersion
    const nextVersion = previousVersion + 1
    const storageKey = this.storage.createVersionStorageKey(read.document.id, nextVersion)
    try {
      this.storage.write(storageKey, data)
      this.storage.write(read.document.storageKey, data)
      const version = this.repos.documents.createVersion({
        documentId: read.document.id,
        version: nextVersion,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: input.changeSummary ?? "Updated document",
        createdByRunId: input.runContext.runId,
        createdByThreadId: input.runContext.threadId,
      })
      const document = this.repos.documents.updateCurrentVersion({
        documentId: read.document.id,
        versionId: version.id,
        version: nextVersion,
        storageKey: read.document.storageKey,
        sizeBytes: data.byteLength,
        previewText: buildPreviewText(changed.content, this.config.documentPreviewMaxChars),
      })
      if (!document) {
        return { ok: false, code: "document_not_found", message: "Document not found", status: 404 }
      }
      return {
        ok: true,
        document,
        previousVersion,
        currentVersion: nextVersion,
        section: changed.section,
      }
    } catch {
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to update document content",
        status: 500,
      }
    }
  }

  private findSection(
    content: string,
    sectionPath: string
  ): DocumentResult<{ section: MarkdownSection }> | DocumentError {
    const target = sectionPath.trim()
    const matches = parseMarkdownSections(content).filter(
      (section) => section.path === target || section.heading === target
    )
    if (matches.length === 0) {
      return {
        ok: false,
        code: "document_section_not_found",
        message: "Document section not found",
        status: 404,
      }
    }
    if (matches.length > 1) {
      return {
        ok: false,
        code: "document_section_ambiguous",
        message: "Document section is ambiguous",
        status: 400,
      }
    }
    return { ok: true, section: matches[0]! }
  }

  private canAccess(document: Document, context: DocumentRunContext) {
    if (document.visibilityScope === "global") return true
    if (document.visibilityScope === "project") {
      return Boolean(document.projectId && document.projectId === context.projectId)
    }
    return Boolean(document.threadId && document.threadId === context.threadId)
  }

  private captureProvenance(input: {
    projectId?: string
    threadId?: string
    runId?: string
  }): DocumentResult<{ provenance: DocumentProvenance }> | DocumentError {
    const project = input.projectId
      ? this.repos.projects.getById(input.projectId)
      : null
    const run = input.runId ? this.repos.runs.getById(input.runId) : null
    if (input.runId && !run) {
      return {
        ok: false,
        code: "invalid_document_provenance",
        message: "Run not found for document provenance",
        status: 400,
      }
    }
    if (run && input.threadId && run.threadId !== input.threadId) {
      return {
        ok: false,
        code: "invalid_document_provenance",
        message: "Document run and thread do not match",
        status: 400,
      }
    }

    const threadId = run?.threadId ?? input.threadId
    const thread = threadId ? this.repos.threads.getById(threadId) : null
    if (threadId && !thread) {
      return {
        ok: false,
        code: "invalid_document_provenance",
        message: "Thread not found for document provenance",
        status: 400,
      }
    }
    const agentId = run?.agentId ?? thread?.agentId
    const agent = agentId ? this.repos.agents.getById(agentId) : null
    return {
      ok: true,
      provenance: {
        threadId,
        projectNameSnapshot: project?.name,
        threadTitleSnapshot: thread?.title,
        agentId: agentId ?? undefined,
        agentNameSnapshot: thread?.agentNameSnapshot ?? agent?.name ?? undefined,
      },
    }
  }
}
