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
  documentNotAccessibleError,
  DocumentScopePolicy,
  generatedVisibilityScope,
  type DocumentRunContext,
  uploadVisibilityScope,
} from "./document-scope-policy.js"
import {
  appendMarkdownSection,
  parseMarkdownSections,
  replaceMarkdownSectionContent,
  type MarkdownSection,
} from "./markdown-sections.js"

export type { DocumentRunContext } from "./document-scope-policy.js"

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

type MarkdownDocumentWriteResult =
  | DocumentResult<{ document: Document; currentVersion: number }>
  | DocumentError

function inferMimeType(filename: string, fallback?: string): string {
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

function buildPreviewText(
  content: string,
  maxChars: number
): string | undefined {
  const trimmed = content.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars)}…`
}

function contentHash(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex")
}

function contentFormatFor(
  _documentType: DocumentType,
  _mimeType: string
): "markdown" {
  return "markdown"
}

function isMarkdownUpload(filename: string, mimeType: string): boolean {
  const normalizedMimeType = mimeType.split(";")[0]?.trim().toLowerCase()
  const extension = extname(filename).toLowerCase()
  if (normalizedMimeType === "text/markdown") return true
  if (normalizedMimeType === "text/plain") return true
  if (
    normalizedMimeType === "application/octet-stream" &&
    (extension === ".md" || extension === ".markdown" || extension === ".txt")
  ) {
    return true
  }
  return false
}

function currentVersion(document: Document): number {
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

function documentContentRequiredError(): DocumentError {
  return documentError(
    "document_content_required",
    "Document content is required",
    400
  )
}

function documentVersionConflictError(): DocumentError {
  return documentError(
    "document_version_conflict",
    "Document changed since editing started. Reload and try again.",
    409
  )
}

function isDocumentVersionConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed") &&
    error.message.includes("document_versions") &&
    error.message.includes("version")
  )
}

function documentVersionNotFoundError(): DocumentError {
  return documentError(
    "document_version_not_found",
    "Document version not found",
    404
  )
}

function documentNotMarkdownError(): DocumentError {
  return documentError("document_not_markdown", "Document is not markdown", 400)
}

function documentTooLargeError(
  message = "Document exceeds maximum size"
): DocumentError {
  return documentError("document_too_large", message, 413)
}

function documentSectionNotFoundError(): DocumentError {
  return documentError(
    "document_section_not_found",
    "Document section not found",
    404
  )
}

function documentSectionAmbiguousError(): DocumentError {
  return documentError(
    "document_section_ambiguous",
    "Document section is ambiguous",
    400
  )
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

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  )
}

export class DocumentService {
  private readonly storage: LocalDocumentStorage
  private readonly scopePolicy: DocumentScopePolicy

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {
    this.storage = new LocalDocumentStorage(config)
    this.scopePolicy = new DocumentScopePolicy(repos)
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
  }): MarkdownDocumentWriteResult {
    if (!input.content.trim()) {
      return documentContentRequiredError()
    }
    const data = Buffer.from(input.content, "utf8")
    if (data.byteLength > this.config.documentMaxUploadBytes) {
      return documentTooLargeError()
    }

    const provenanceResult = this.scopePolicy.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
    })
    if (!provenanceResult.ok) return provenanceResult

    const scopeError = this.scopePolicy.validateScope(input.visibilityScope, {
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
        documentType: "document",
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
  }): MarkdownDocumentWriteResult {
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
      return documentTooLargeError("Document exceeds maximum upload size")
    }
    const provenanceResult = this.scopePolicy.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
    })
    if (!provenanceResult.ok) return provenanceResult

    const mimeType = inferMimeType(input.filename, input.mimeType)
    if (!isMarkdownUpload(input.filename, mimeType)) {
      return documentNotMarkdownError()
    }
    const textContent = input.data.toString("utf8")
    const visibilityScope = uploadVisibilityScope({
      projectId: input.projectId,
      threadId: provenanceResult.provenance.threadId,
    })
    const scopeError = this.scopePolicy.validateScope(visibilityScope, {
      projectId: input.projectId,
      threadId: provenanceResult.provenance.threadId,
    })
    if (scopeError) return scopeError

    const documentId = createId("document")
    const storageKey =
      input.documentType === "document"
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
        input.documentType === "document"
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
      .filter((document) =>
        this.scopePolicy.canAccess(document, input.runContext)
      )
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
    if (!this.scopePolicy.canAccess(document, input.runContext)) {
      return documentNotAccessibleError()
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
      return documentVersionNotFoundError()
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
        document.type === "document" ? parseMarkdownSections(content) : [],
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
        return documentSectionNotFoundError()
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
        return documentVersionNotFoundError()
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
      return documentContentRequiredError()
    }

    const document = this.repos.documents.getById(input.documentId)
    if (!document) return documentNotFoundError()
    if (document.type !== "document") {
      return documentNotMarkdownError()
    }

    const current = currentVersion(document)
    if (!current) {
      return documentVersionNotFoundError()
    }
    if (input.baseVersion !== current) {
      return documentVersionConflictError()
    }

    const read = this.readDocumentContent(document.id)
    if (!read.ok) return read
    if (read.truncated) {
      return documentTooLargeError("Document exceeds maximum editable size")
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
      return documentTooLargeError()
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
      if (!updated) {
        this.deleteStoredDocument(storageKey)
        return documentNotFoundError()
      }
      return {
        ok: true,
        document: updated,
        currentVersion: nextVersion,
      }
    } catch (error) {
      this.deleteStoredDocument(storageKey)
      if (isDocumentVersionConflictError(error)) {
        return documentVersionConflictError()
      }
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
    threadId?: string
    runContext?: DocumentRunContext
  }):
    | DocumentResult<{
        document: Document
        previousVisibilityScope: DocumentVisibilityScope
      }>
    | DocumentError {
    const document = this.repos.documents.getById(input.documentId)
    if (!document) return documentNotFoundError()

    if (
      input.runContext &&
      !this.scopePolicy.canAccess(document, input.runContext)
    ) {
      return documentNotAccessibleError()
    }

    const projectScopeChanged =
      input.visibilityScope === "project" &&
      input.projectId &&
      input.projectId !== document.projectId

    if (
      document.visibilityScope === input.visibilityScope &&
      !projectScopeChanged
    ) {
      return {
        ok: false,
        code: "document_scope_unchanged",
        message: "Document already uses this visibility scope",
        status: 400,
      }
    }

    const assignment = this.scopePolicy.resolveVisibilityScopeAssignment(
      document,
      input.visibilityScope,
      input.runContext,
      input.projectId,
      input.threadId
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

  private readDocumentContent(
    documentId: string,
    version?: number
  ):
    | DocumentResult<{
        content: string
        truncated: boolean
        currentVersion: number
      }>
    | DocumentError {
    const document = this.repos.documents.getById(documentId)
    if (!document) return documentNotFoundError()

    let versionRow: DocumentVersion | null = null
    if (version) {
      versionRow = this.repos.documents.getVersion(documentId, version)
      if (!versionRow) {
        return documentVersionNotFoundError()
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
    if (!this.scopePolicy.canAccess(document, input.runContext)) {
      return documentNotAccessibleError()
    }
    if (document.type !== "document") {
      return documentNotMarkdownError()
    }

    const read = this.readDocument({
      documentId: input.documentId,
      maxBytes: this.config.documentMaxUploadBytes,
      runContext: input.runContext,
    })
    if (!read.ok) return read
    if (read.truncated) {
      return documentTooLargeError("Document exceeds maximum editable size")
    }
    const changed = change(read.content)
    if (!changed.ok) return changed
    const data = Buffer.from(changed.content, "utf8")
    if (data.byteLength > this.config.documentMaxUploadBytes) {
      return documentTooLargeError()
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
      return documentSectionNotFoundError()
    }
    if (matches.length > 1) {
      return documentSectionAmbiguousError()
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

  private deleteStoredDocument(storageKey: string): void {
    try {
      this.storage.delete(storageKey)
    } catch (error) {
      console.error("Failed to clean up document storage", {
        error,
        storageKey,
      })
    }
  }
}
