import type { Artifact, ArtifactVisibilityScope } from "@workspace/shared"
import {
  ArtifactService,
  artifactNotAccessibleError,
  generatedArtifactVisibilityScope,
  uploadArtifactVisibilityScope,
  type ArtifactProvenance,
  type ArtifactRunContext,
} from "../artifacts/artifact-service.js"
import type { Repositories } from "../repositories/index.js"

type ScopePolicyError = {
  ok: false
  code: string
  message: string
  status?: number
}

function toDocumentScopeError(error: ScopePolicyError): ScopePolicyError {
  const codeMap: Record<string, string> = {
    artifact_not_accessible: "document_not_accessible",
    invalid_artifact_scope: "invalid_document_scope",
    invalid_artifact_provenance: "invalid_document_provenance",
  }
  return {
    ...error,
    code: codeMap[error.code] ?? error.code,
    message: error.message
      .replace(/Artifacts/g, "Documents")
      .replace(/Artifact/g, "Document")
      .replace(/artifacts/g, "documents")
      .replace(/artifact/g, "document"),
  }
}

function mapScopeResult<T extends { ok: true } | ScopePolicyError>(result: T): T {
  if (result.ok) return result
  return toDocumentScopeError(result) as T
}

export function documentNotAccessibleError(): ScopePolicyError {
  return toDocumentScopeError(artifactNotAccessibleError())
}

export class DocumentScopePolicy {
  private readonly artifactService: ArtifactService

  constructor(repos: Repositories) {
    this.artifactService = new ArtifactService(repos)
  }

  canAccess(artifact: Artifact, context: ArtifactRunContext): boolean {
    return this.artifactService.canAccess(artifact, context)
  }

  validateScope(
    visibilityScope: ArtifactVisibilityScope,
    input: { projectId?: string; threadId?: string }
  ): ScopePolicyError | null {
    const error = this.artifactService.validateScope(visibilityScope, input)
    return error ? toDocumentScopeError(error) : null
  }

  captureProvenance(input: {
    projectId?: string
    threadId?: string
    runId?: string
  }) {
    return mapScopeResult(this.artifactService.captureProvenance(input))
  }

  resolveVisibilityScopeAssignment(
    artifact: Artifact,
    visibilityScope: ArtifactVisibilityScope,
    runContext?: ArtifactRunContext,
    explicitProjectId?: string
  ) {
    return mapScopeResult(
      this.artifactService.resolveVisibilityScopeAssignment(
        artifact,
        visibilityScope,
        runContext,
        explicitProjectId
      )
    )
  }
}

export {
  generatedArtifactVisibilityScope as generatedVisibilityScope,
  uploadArtifactVisibilityScope as uploadVisibilityScope,
  type ArtifactRunContext as DocumentRunContext,
  type ArtifactProvenance as DocumentProvenance,
}
