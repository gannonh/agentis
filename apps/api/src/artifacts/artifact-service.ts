import type { Artifact, ArtifactVisibilityScope } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export type ArtifactRunContext = {
  threadId?: string
  projectId?: string
  runId?: string
}

export type ArtifactProvenance = {
  threadId?: string
  projectNameSnapshot?: string
  threadTitleSnapshot?: string
  agentId?: string
  agentNameSnapshot?: string
}

type ArtifactResult<T> = { ok: true } & T
type ArtifactError = {
  ok: false
  code: string
  message: string
  status?: number
}

function artifactError(
  code: string,
  message: string,
  status: number
): ArtifactError {
  return { ok: false, code, message, status }
}

function invalidProvenanceError(message: string): ArtifactError {
  return artifactError("invalid_document_provenance", message, 400)
}

function invalidArtifactScopeError(message: string): ArtifactError {
  return artifactError("invalid_document_scope", message, 400)
}

export function artifactNotAccessibleError(): ArtifactError {
  return artifactError(
    "document_not_accessible",
    "Document is not accessible from this run",
    403
  )
}

export function generatedArtifactVisibilityScope(input: {
  visibilityScope?: ArtifactVisibilityScope
  projectId?: string
}): ArtifactVisibilityScope {
  if (input.visibilityScope) return input.visibilityScope
  return input.projectId ? "project" : "thread"
}

export function uploadArtifactVisibilityScope(input: {
  projectId?: string
  threadId?: string
}): ArtifactVisibilityScope {
  if (input.projectId) return "project"
  if (input.threadId) return "thread"
  return "global"
}

export class ArtifactService {
  constructor(private readonly repos: Repositories) {}

  canAccess(artifact: Artifact, context: ArtifactRunContext): boolean {
    if (artifact.visibilityScope === "global") return true
    if (artifact.visibilityScope === "project") {
      return Boolean(
        artifact.projectId && artifact.projectId === context.projectId
      )
    }
    return Boolean(artifact.threadId && artifact.threadId === context.threadId)
  }

  validateScope(
    visibilityScope: ArtifactVisibilityScope,
    input: { projectId?: string; threadId?: string }
  ): ArtifactError | null {
    if (visibilityScope === "project" && !input.projectId) {
      return invalidArtifactScopeError(
        "Project-scoped documents require a project"
      )
    }
    if (visibilityScope === "thread" && !input.threadId) {
      return invalidArtifactScopeError(
        "Thread-scoped documents require a thread"
      )
    }
    return null
  }

  captureProvenance(input: {
    projectId?: string
    threadId?: string
    runId?: string
  }): ArtifactResult<{ provenance: ArtifactProvenance }> | ArtifactError {
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
    artifact: Artifact,
    visibilityScope: ArtifactVisibilityScope,
    runContext?: ArtifactRunContext,
    explicitProjectId?: string
  ):
    | ArtifactResult<{
        projectId: string | null
        projectNameSnapshot: string | null
        threadId: string | null
        threadTitleSnapshot: string | null
      }>
    | ArtifactError {
    if (visibilityScope === "global") {
      return {
        ok: true,
        projectId: artifact.projectId ?? null,
        projectNameSnapshot: artifact.projectNameSnapshot ?? null,
        threadId: artifact.threadId ?? null,
        threadTitleSnapshot: artifact.threadTitleSnapshot ?? null,
      }
    }

    if (visibilityScope === "thread") {
      const threadId = runContext?.threadId ?? artifact.threadId
      if (!threadId) {
        return invalidArtifactScopeError(
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
      artifact.projectId ??
      undefined
    if (!projectId) {
      const threadId = runContext?.threadId ?? artifact.threadId
      const thread = threadId ? this.repos.threads.getById(threadId) : null
      projectId = thread?.projectId ?? undefined
    }
    if (!projectId) {
      return invalidArtifactScopeError(
        "Project-scoped documents require a project"
      )
    }
    const project = this.repos.projects.getById(projectId)
    if (!project) {
      return invalidProvenanceError("Project not found for document scope")
    }

    const threadId = runContext?.threadId ?? artifact.threadId
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
        thread?.title ?? artifact.threadTitleSnapshot ?? null,
    }
  }
}
