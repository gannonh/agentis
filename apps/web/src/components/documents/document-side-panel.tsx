import type {
  DocumentDetailResponse,
  DocumentPublic as Document,
  DocumentVisibilityScope,
  Project,
} from "@workspace/shared"
import { ArtifactSidePanel } from "@/components/artifacts/artifact-side-panel"
import {
  documentDownloadUrl,
  documentWorkspacePath,
} from "@/lib/api/projects-client"

type DocumentSidePanelProps = {
  document: Document
  detail: DocumentDetailResponse
  selectedVersion: number | null
  viewingHistoricalVersion: boolean
  onSelectVersion: (version: number | null) => void
  onDownload: () => void
  downloadError?: string | null
  versionError?: string | null
  projects?: Project[]
  scopeDraft?: DocumentVisibilityScope
  projectIdDraft?: string
  onVisibilityScopeChange?: (scope: DocumentVisibilityScope) => void
  onProjectChange?: (projectId: string) => void
  scopeSaving?: boolean
  scopeError?: string | null
}

export function DocumentSidePanel({
  document,
  detail,
  selectedVersion,
  viewingHistoricalVersion,
  onSelectVersion,
  onDownload,
  downloadError,
  versionError,
  projects,
  scopeDraft,
  projectIdDraft,
  onVisibilityScopeChange,
  onProjectChange,
  scopeSaving,
  scopeError,
}: DocumentSidePanelProps) {
  return (
    <ArtifactSidePanel
      artifact={document}
      versions={detail.versions}
      currentVersion={detail.currentVersion ?? document.currentVersion ?? null}
      selectedVersion={selectedVersion}
      viewingHistoricalVersion={viewingHistoricalVersion}
      onSelectVersion={onSelectVersion}
      onDownload={onDownload}
      downloadUrl={documentDownloadUrl(document.id)}
      downloadError={downloadError}
      versionError={versionError}
      projects={projects}
      scopeDraft={scopeDraft}
      projectIdDraft={projectIdDraft}
      scopeControlLabel="Document scope"
      onVisibilityScopeChange={onVisibilityScopeChange}
      onProjectChange={onProjectChange}
      scopeSaving={scopeSaving}
      scopeError={scopeError}
      workspaceUrl={documentWorkspacePath(document.id)}
    />
  )
}
