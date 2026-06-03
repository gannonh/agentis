import { createHash } from "node:crypto"
import { extname } from "node:path"
import type {
  Document,
  DocumentType,
  DocumentVersion,
  DocumentVisibilityScope,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { createId } from "../lib/ids.js"
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
type DocumentError = {
  ok: false
  code: string
  message: string
  status?: number
}

type DocumentSectionChange = {
  document: Document
  previousVersion: number
  currentVersion: number
  section: MarkdownSection
}

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

const SCOPE_SORT_ORDER: Record<DocumentVisibilityScope, number> = {
  global: 0,
  project: 1,
  thread: 2,
}

function documentError(
  code: string,
  message: string,
  status: number
): DocumentError {
  return { ok: false, code, message, status }
}

function documentNotFoundError(): DocumentError {
  return documentError("document_not_found", "Document not found", 404)
}

function invalidProvenanceError(message: string): DocumentError {
  return documentError("invalid_document_provenance", message, 400)
}

function generatedVisibilityScope(input: {
  visibilityScope?: DocumentVisibilityScope
  projectId?: string
}): DocumentVisibilityScope {
  if (input.visibilityScope) return input.visibilityScope
  return input.projectId ? "project" : "thread"
}

function uploadVisibilityScope(input: {
  projectId?: string
  threadId?: string
}): DocumentVisibilityScope {
  if (input.projectId) return "project"
  if (input.threadId) return "thread"
  return "global"
}

function truncateUtf8ToBytes(
  text: string,
  maxBytes: number
): { text: string; truncated: boolean } {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) {
    return { text, truncated: false }
  }
  let end = text.length
  while (end > 0 && Buffer.byteLength(text.slice(0, end), "utf8") > maxBytes) {
    end -= 1
  }
  return { text: text.slice(0, end), truncated: true }
}

function isNodeErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  )
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
  }):
    | DocumentResult<{ document: Document; currentVersion: number }>
    | DocumentError {
    if (!input.content.trim()) {
      return {
        ok: false,
        code: "document_content_required",
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

    const scopeError = this.validateScope(input.visibilityScope, {
      projectId: input.projectId,
      threadId: provenanceResult.provenance.threadId,
    })
    if (scopeError) return scopeError

    const documentId = createId("document")
    const storageKey = this.storage.createVersionStorageKey(documentId, 1)
    try {
      this.storage.write(storageKey, data)
    } catch (error) {
      console.error("Failed to store document content", { error, documentId })
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to store document content",
        status: 500,
      }
    }

    try {
      const { document } = this.repos.documents.createWithInitialVersion({
        id: documentId,
        title: input.title,
        description: input.description,
        documentType: "markdown",
        contentFormat: "markdown",
        mimeType: "text/markdown",
        sizeBytes: data.byteLength,
        storageKey,
        previewText: buildPreviewText(
          input.content,
          this.config.documentPreviewMaxChars
        ),
        metadata: input.tags?.length ? { tags: input.tags } : undefined,
        visibilityScope: input.visibilityScope,
        projectId: input.projectId,
        runId: input.runId,
        ...provenanceResult.provenance,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: input.changeSummary ?? "Created document",
        createdByRunId: input.runId,
        createdByThreadId: provenanceResult.provenance.threadId,
      })
      return { ok: true, document, currentVersion: 1 }
    } catch (error) {
      this.deleteStoredDocument(storageKey)
      console.error("Failed to persist document metadata", {
        error,
        documentId,
        storageKey,
      })
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
      visibilityScope: generatedVisibilityScope(input),
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

    const mimeType = inferMimeType(input.filename, input.mimeType)
    const textContent = mimeType.startsWith("text/")
      ? input.data.toString("utf8")
      : ""
    const visibilityScope = uploadVisibilityScope({
      projectId: input.projectId,
      threadId: provenanceResult.provenance.threadId,
    })
    const scopeError = this.validateScope(visibilityScope, {
      projectId: input.projectId,
      threadId: provenanceResult.provenance.threadId,
    })
    if (scopeError) return scopeError

    const documentId = createId("document")
    const storageKey =
      input.documentType === "markdown"
        ? this.storage.createVersionStorageKey(documentId, 1)
        : this.storage.createStorageKey(input.filename)
    try {
      this.storage.write(storageKey, input.data)
    } catch (error) {
      console.error("Failed to store uploaded document", {
        error,
        documentId,
        storageKey,
      })
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to store document file",
        status: 500,
      }
    }

    try {
      const baseDocument = {
        id: documentId,
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
        visibilityScope,
        projectId: input.projectId,
        ...provenanceResult.provenance,
      }
      const document =
        input.documentType === "markdown"
          ? this.repos.documents.createWithInitialVersion({
              ...baseDocument,
              contentHash: contentHash(input.data),
              contentStorageKey: storageKey,
              changeSummary: "Uploaded document",
              createdByThreadId: provenanceResult.provenance.threadId,
            }).document
          : this.repos.documents.create(baseDocument)
      return { ok: true, document }
    } catch (error) {
      this.deleteStoredDocument(storageKey)
      console.error("Failed to persist uploaded document metadata", {
        error,
        documentId,
        storageKey,
      })
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
      .sort(
        (left, right) =>
          SCOPE_SORT_ORDER[left.visibilityScope] -
          SCOPE_SORT_ORDER[right.visibilityScope]
      )
      .slice(0, limit)
  }

  readDocument(input: {
    documentId: string
    version?: number
    maxChars?: number
    maxBytes?: number
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
    if (!document) return documentNotFoundError()
    if (!this.canAccess(document, input.runContext)) {
      return {
        ok: false,
        code: "document_not_accessible",
        message: "Document is not accessible from this run",
        status: 403,
      }
    }

    let version: DocumentVersion | null = null
    if (input.version) {
      version = this.repos.documents.getVersion(document.id, input.version)
    } else if (document.currentVersion) {
      version = this.repos.documents.getVersion(
        document.id,
        document.currentVersion
      )
    }
    if (input.version && !version) {
      return {
        ok: false,
        code: "document_version_not_found",
        message: "Document version not found",
        status: 404,
      }
    }
    if (document.contentFormat === "binary") {
      return documentError(
        "document_not_readable",
        "Binary documents cannot be read as text",
        400
      )
    }

    const storageKey = version?.contentStorageKey ?? document.storageKey
    let content: string
    try {
      content = this.storage.read(storageKey).toString("utf8")
    } catch (error) {
      return this.storageReadError(error, {
        documentId: document.id,
        storageKey,
      })
    }

    let maxChars = input.maxChars ?? 32_000
    let truncated = false
    let bounded = content
    if (input.maxBytes != null) {
      const limited = truncateUtf8ToBytes(content, input.maxBytes)
      bounded = limited.text
      truncated = limited.truncated
      maxChars = bounded.length
    } else if (content.length > maxChars) {
      truncated = true
      bounded = content.slice(0, maxChars)
    }
    return {
      ok: true,
      document,
      content: bounded,
      truncated,
      maxChars,
      outline:
        document.documentType === "markdown"
          ? parseMarkdownSections(content)
          : [],
      currentVersion: currentVersion(document),
    }
  }

  updateDocumentSection(input: {
    documentId: string
    sectionPath: string
    content: string
    changeSummary?: string
    runContext: DocumentRunContext
  }): DocumentResult<DocumentSectionChange> | DocumentError {
    return this.changeMarkdownDocument(input, (content) => {
      const section = this.findSection(content, input.sectionPath)
      if (!section.ok) return section
      return {
        ok: true,
        content: replaceMarkdownSectionContent(
          content,
          section.section,
          input.content
        ),
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
  }): DocumentResult<DocumentSectionChange> | DocumentError {
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
      let section = parent ?? outline[outline.length - 1]
      if (input.heading) {
        section =
          outline.find((entry) => entry.heading === input.heading?.trim()) ??
          outline[outline.length - 1]
      }
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

  getDownload(
    documentId: string
  ): DocumentResult<{ document: Document; data: Buffer }> | DocumentError {
    const document = this.repos.documents.getById(documentId)
    if (!document) return documentNotFoundError()
    try {
      return {
        ok: true,
        document,
        data: this.storage.read(document.storageKey),
      }
    } catch (error) {
      return this.storageReadError(error, {
        documentId: document.id,
        storageKey: document.storageKey,
      })
    }
  }

  getDocumentDetail(input: { documentId: string; version?: number }):
    | DocumentResult<{
        document: Document
        content: string | null
        truncated: boolean
        selectedVersion: number | null
        currentVersion: number | null
        versions: DocumentVersion[]
      }>
    | DocumentError {
    const document = this.repos.documents.getById(input.documentId)
    if (!document) return documentNotFoundError()

    const versions = this.repos.documents.listVersions(document.id)
    const resolvedCurrentVersion = currentVersion(document) || null
    const selectedVersionNumber =
      input.version ?? resolvedCurrentVersion ?? null

    if (input.version) {
      const versionExists = versions.some(
        (version) => version.version === input.version
      )
      if (!versionExists) {
        return {
          ok: false,
          code: "document_version_not_found",
          message: "Document version not found",
          status: 404,
        }
      }
    }

    if (document.contentFormat === "binary") {
      return {
        ok: true,
        document,
        content: null,
        truncated: false,
        selectedVersion: selectedVersionNumber,
        currentVersion: resolvedCurrentVersion,
        versions,
      }
    }

    let version: DocumentVersion | null = null
    if (input.version) {
      version = this.repos.documents.getVersion(document.id, input.version)
    } else if (resolvedCurrentVersion) {
      version = this.repos.documents.getVersion(
        document.id,
        resolvedCurrentVersion
      )
    }

    const storageKey = version?.contentStorageKey ?? document.storageKey
    let content: string
    try {
      content = this.storage.read(storageKey).toString("utf8")
    } catch (error) {
      return this.storageReadError(error, {
        documentId: document.id,
        storageKey,
      })
    }

    const limited = truncateUtf8ToBytes(
      content,
      this.config.documentMaxUploadBytes
    )

    return {
      ok: true,
      document,
      content: limited.text,
      truncated: limited.truncated,
      selectedVersion: input.version ?? resolvedCurrentVersion,
      currentVersion: resolvedCurrentVersion,
      versions,
    }
  }

  updateDocumentContent(input: {
    documentId: string
    content: string
    baseVersion: number
    changeSummary?: string
  }):
    | DocumentResult<{ document: Document; currentVersion: number }>
    | DocumentError {
    if (!input.content.trim()) {
      return {
        ok: false,
        code: "document_content_required",
        message: "Document content is required",
        status: 400,
      }
    }

    const document = this.repos.documents.getById(input.documentId)
    if (!document) return documentNotFoundError()
    if (document.documentType !== "markdown") {
      return {
        ok: false,
        code: "document_not_markdown",
        message: "Document is not markdown",
        status: 400,
      }
    }

    const current = currentVersion(document)
    if (!current) {
      return {
        ok: false,
        code: "document_version_not_found",
        message: "Document version not found",
        status: 404,
      }
    }
    if (input.baseVersion !== current) {
      return {
        ok: false,
        code: "document_version_conflict",
        message:
          "Document changed since editing started. Reload and try again.",
        status: 409,
      }
    }

    const read = this.readDocumentContent(document.id)
    if (!read.ok) return read
    if (read.truncated) {
      return {
        ok: false,
        code: "document_too_large",
        message: "Document exceeds maximum editable size",
        status: 413,
      }
    }
    if (read.content === input.content) {
      return {
        ok: false,
        code: "document_content_unchanged",
        message: "Document content is unchanged",
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

    const nextVersion = current + 1
    const storageKey = this.storage.createVersionStorageKey(
      document.id,
      nextVersion
    )
    try {
      this.storage.write(storageKey, data)
      const updated = this.repos.documents.updateWithVersion({
        documentId: document.id,
        version: nextVersion,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: input.changeSummary ?? "Updated in document workspace",
        sizeBytes: data.byteLength,
        previewText: buildPreviewText(
          input.content,
          this.config.documentPreviewMaxChars
        ),
      })
      if (!updated) return documentNotFoundError()
      return {
        ok: true,
        document: updated,
        currentVersion: nextVersion,
      }
    } catch (error) {
      this.deleteStoredDocument(storageKey)
      console.error("Failed to update document content", {
        error,
        documentId: document.id,
        version: nextVersion,
        storageKey,
      })
      return {
        ok: false,
        code: "document_storage_failed",
        message: "Failed to update document content",
        status: 500,
      }
    }
  }

  updateDocumentVisibility(input: {
    documentId: string
    visibilityScope: DocumentVisibilityScope
    projectId?: string
    runContext?: DocumentRunContext
  }):
    | DocumentResult<{
        document: Document
        previousVisibilityScope: DocumentVisibilityScope
      }>
    | DocumentError {
    const document = this.repos.documents.getById(input.documentId)
    if (!document) return documentNotFoundError()

    if (input.runContext && !this.canAccess(document, input.runContext)) {
      return {
        ok: false,
        code: "document_not_accessible",
        message: "Document is not accessible from this run",
        status: 403,
      }
    }

    const projectScopeChanged =
      input.visibilityScope === "project" &&
      input.projectId &&
      input.projectId !== document.projectId

    if (document.visibilityScope === input.visibilityScope && !projectScopeChanged) {
      return {
        ok: false,
        code: "document_scope_unchanged",
        message: "Document already uses this visibility scope",
        status: 400,
      }
    }

    const assignment = this.resolveVisibilityScopeAssignment(
      document,
      input.visibilityScope,
      input.runContext,
      input.projectId
    )
    if (!assignment.ok) return assignment

    const updated = this.repos.documents.updateVisibilityScope({
      documentId: document.id,
      visibilityScope: input.visibilityScope,
      projectId: assignment.projectId,
      projectNameSnapshot: assignment.projectNameSnapshot,
      threadId: assignment.threadId,
      threadTitleSnapshot: assignment.threadTitleSnapshot,
    })
    if (!updated) return documentNotFoundError()

    return {
      ok: true,
      document: updated,
      previousVisibilityScope: document.visibilityScope,
    }
  }

  private resolveVisibilityScopeAssignment(
    document: Document,
    visibilityScope: DocumentVisibilityScope,
    runContext?: DocumentRunContext,
    explicitProjectId?: string
  ):
    | DocumentResult<{
        projectId: string | null
        projectNameSnapshot: string | null
        threadId: string | null
        threadTitleSnapshot: string | null
      }>
    | DocumentError {
    if (visibilityScope === "global") {
      return {
        ok: true,
        projectId: document.projectId ?? null,
        projectNameSnapshot: document.projectNameSnapshot ?? null,
        threadId: document.threadId ?? null,
        threadTitleSnapshot: document.threadTitleSnapshot ?? null,
      }
    }

    if (visibilityScope === "thread") {
      const threadId = runContext?.threadId ?? document.threadId
      if (!threadId) {
        return {
          ok: false,
          code: "invalid_document_scope",
          message: "Thread-scoped documents require a thread",
          status: 400,
        }
      }
      const thread = this.repos.threads.getById(threadId)
      if (!thread) {
        return invalidProvenanceError("Thread not found for document scope")
      }
      const project = thread.projectId
        ? this.repos.projects.getById(thread.projectId)
        : null
      return {
        ok: true,
        projectId: thread.projectId ?? null,
        projectNameSnapshot: project?.name ?? null,
        threadId,
        threadTitleSnapshot: thread.title,
      }
    }

    let projectId =
      explicitProjectId ?? runContext?.projectId ?? document.projectId ?? undefined
    if (!projectId) {
      const threadId = runContext?.threadId ?? document.threadId
      const thread = threadId ? this.repos.threads.getById(threadId) : null
      projectId = thread?.projectId ?? undefined
    }
    if (!projectId) {
      return {
        ok: false,
        code: "invalid_document_scope",
        message: "Project-scoped documents require a project",
        status: 400,
      }
    }
    const project = this.repos.projects.getById(projectId)
    if (!project) {
      return invalidProvenanceError("Project not found for document scope")
    }

    const threadId = runContext?.threadId ?? document.threadId
    const thread = threadId ? this.repos.threads.getById(threadId) : null
    if (thread && thread.projectId && thread.projectId !== projectId) {
      return invalidProvenanceError("Document project and thread do not match")
    }

    return {
      ok: true,
      projectId,
      projectNameSnapshot: project.name,
      threadId: threadId ?? null,
      threadTitleSnapshot: thread?.title ?? document.threadTitleSnapshot ?? null,
    }
  }

  private readDocumentContent(
    documentId: string,
    version?: number
  ):
    | DocumentResult<{ content: string; truncated: boolean; currentVersion: number }>
    | DocumentError {
    const document = this.repos.documents.getById(documentId)
    if (!document) return documentNotFoundError()
    if (document.contentFormat === "binary") {
      return documentError(
        "document_not_readable",
        "Binary documents cannot be read as text",
        400
      )
    }

    let versionRow: DocumentVersion | null = null
    if (version) {
      versionRow = this.repos.documents.getVersion(documentId, version)
      if (!versionRow) {
        return {
          ok: false,
          code: "document_version_not_found",
          message: "Document version not found",
          status: 404,
        }
      }
    } else if (document.currentVersion) {
      versionRow = this.repos.documents.getVersion(
        documentId,
        document.currentVersion
      )
    }

    const storageKey = versionRow?.contentStorageKey ?? document.storageKey
    let content: string
    try {
      content = this.storage.read(storageKey).toString("utf8")
    } catch (error) {
      return this.storageReadError(error, { documentId, storageKey })
    }

    const limited = truncateUtf8ToBytes(
      content,
      this.config.documentMaxUploadBytes
    )
    return {
      ok: true,
      content: limited.text,
      truncated: limited.truncated,
      currentVersion: currentVersion(document),
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
  ): DocumentResult<DocumentSectionChange> | DocumentError {
    const document = this.repos.documents.getById(input.documentId)
    if (!document) return documentNotFoundError()
    if (!this.canAccess(document, input.runContext)) {
      return {
        ok: false,
        code: "document_not_accessible",
        message: "Document is not accessible from this run",
        status: 403,
      }
    }
    if (document.documentType !== "markdown") {
      return {
        ok: false,
        code: "document_not_markdown",
        message: "Document is not markdown",
        status: 400,
      }
    }

    const read = this.readDocument({
      documentId: input.documentId,
      maxBytes: this.config.documentMaxUploadBytes,
      runContext: input.runContext,
    })
    if (!read.ok) return read
    if (read.truncated) {
      return {
        ok: false,
        code: "document_too_large",
        message: "Document exceeds maximum editable size",
        status: 413,
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
    const storageKey = this.storage.createVersionStorageKey(
      read.document.id,
      nextVersion
    )
    try {
      this.storage.write(storageKey, data)
      const document = this.repos.documents.updateWithVersion({
        documentId: read.document.id,
        version: nextVersion,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: input.changeSummary ?? "Updated document",
        createdByRunId: input.runContext.runId,
        createdByThreadId: input.runContext.threadId,
        sizeBytes: data.byteLength,
        previewText: buildPreviewText(
          changed.content,
          this.config.documentPreviewMaxChars
        ),
      })
      if (!document) return documentNotFoundError()
      return {
        ok: true,
        document,
        previousVersion,
        currentVersion: nextVersion,
        section: changed.section,
      }
    } catch (error) {
      this.deleteStoredDocument(storageKey)
      console.error("Failed to update document content", {
        error,
        documentId: read.document.id,
        version: nextVersion,
        storageKey,
      })
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

  private storageReadError(
    error: unknown,
    context: { documentId: string; storageKey: string }
  ): DocumentError {
    if (isNodeErrorCode(error, "ENOENT")) {
      return {
        ok: false,
        code: "document_blob_missing",
        message: "Stored document content is missing",
        status: 404,
      }
    }
    console.error("Failed to read document content", { error, ...context })
    return {
      ok: false,
      code: "document_storage_failed",
      message: "Failed to read stored document content",
      status: 500,
    }
  }

  private deleteStoredDocument(storageKey: string) {
    try {
      this.storage.delete(storageKey)
    } catch (error) {
      console.error("Failed to clean up document storage", {
        error,
        storageKey,
      })
    }
  }

  private validateScope(
    visibilityScope: DocumentVisibilityScope,
    input: { projectId?: string; threadId?: string }
  ): DocumentError | null {
    if (visibilityScope === "project" && !input.projectId) {
      return {
        ok: false,
        code: "invalid_document_scope",
        message: "Project-scoped documents require a project",
        status: 400,
      }
    }
    if (visibilityScope === "thread" && !input.threadId) {
      return {
        ok: false,
        code: "invalid_document_scope",
        message: "Thread-scoped documents require a thread",
        status: 400,
      }
    }
    return null
  }

  private canAccess(document: Document, context: DocumentRunContext) {
    if (document.visibilityScope === "global") return true
    if (document.visibilityScope === "project") {
      return Boolean(
        document.projectId && document.projectId === context.projectId
      )
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
    if (input.projectId && !project) {
      return invalidProvenanceError("Project not found for document provenance")
    }

    const run = input.runId ? this.repos.runs.getById(input.runId) : null
    if (input.runId && !run) {
      return invalidProvenanceError("Run not found for document provenance")
    }
    if (run && input.threadId && run.threadId !== input.threadId) {
      return invalidProvenanceError("Document run and thread do not match")
    }

    const threadId = run?.threadId ?? input.threadId
    const thread = threadId ? this.repos.threads.getById(threadId) : null
    if (threadId && !thread) {
      return invalidProvenanceError("Thread not found for document provenance")
    }
    if (input.projectId && thread && thread.projectId !== input.projectId) {
      return invalidProvenanceError("Document project and thread do not match")
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
        agentNameSnapshot:
          thread?.agentNameSnapshot ?? agent?.name ?? undefined,
      },
    }
  }
}
