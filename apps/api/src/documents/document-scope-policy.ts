import type { Document, DocumentVisibilityScope } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export type DocumentRunContext = {
  threadId?: string
  projectId?: string
  runId?: string
}

export type DocumentProvenance = {
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

function documentError(
  code: string,
  message: string,
  status: number
): DocumentError {
  return { ok: false, code, message, status }
}

function invalidProvenanceError(message: string): DocumentError {
  return documentError("invalid_document_provenance", message, 400)
}

function invalidDocumentScopeError(message: string): DocumentError {
  return documentError("invalid_document_scope", message, 400)
}

export function documentNotAccessibleError(): DocumentError {
  return documentError(
    "document_not_accessible",
    "Document is not accessible from this run",
    403
  )
}

export function generatedVisibilityScope(input: {
  visibilityScope?: DocumentVisibilityScope
  projectId?: string
}): DocumentVisibilityScope {
  if (input.visibilityScope) return input.visibilityScope
  return input.projectId ? "project" : "thread"
}

export function uploadVisibilityScope(input: {
  projectId?: string
  threadId?: string
}): DocumentVisibilityScope {
  if (input.projectId) return "project"
  if (input.threadId) return "thread"
  return "global"
}

export class DocumentScopePolicy {
  constructor(private readonly repos: Repositories) {}

  canAccess(document: Document, context: DocumentRunContext): boolean {
    if (document.visibilityScope === "global") return true
    if (document.visibilityScope === "project") {
      return Boolean(
        document.projectId && document.projectId === context.projectId
      )
    }
    return Boolean(document.threadId && document.threadId === context.threadId)
  }

  validateScope(
    visibilityScope: DocumentVisibilityScope,
    input: { projectId?: string; threadId?: string }
  ): DocumentError | null {
    if (visibilityScope === "project" && !input.projectId) {
      return invalidDocumentScopeError(
        "Project-scoped documents require a project"
      )
    }
    if (visibilityScope === "thread" && !input.threadId) {
      return invalidDocumentScopeError(
        "Thread-scoped documents require a thread"
      )
    }
    return null
  }

  captureProvenance(input: {
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

  resolveVisibilityScopeAssignment(
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
        return invalidDocumentScopeError(
          "Thread-scoped documents require a thread"
        )
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
      explicitProjectId ??
      runContext?.projectId ??
      document.projectId ??
      undefined
    if (!projectId) {
      const threadId = runContext?.threadId ?? document.threadId
      const thread = threadId ? this.repos.threads.getById(threadId) : null
      projectId = thread?.projectId ?? undefined
    }
    if (!projectId) {
      return invalidDocumentScopeError(
        "Project-scoped documents require a project"
      )
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
      threadTitleSnapshot:
        thread?.title ?? document.threadTitleSnapshot ?? null,
    }
  }
}
