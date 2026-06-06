import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import type {
  ArtifactDetailResponse,
  ArtifactVisibilityScope,
  Project,
} from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  artifactDownloadUrl,
  downloadArtifactFile,
  getArtifactDetail,
  listProjects,
  updateArtifactVisibility,
} from "@/lib/api/projects-client"
import { ArtifactSidePanel } from "@/components/artifacts/artifact-side-panel"
import { StaticArtifactPreview } from "@/components/static-artifacts/static-artifact-preview"
import { staticArtifactSummary } from "@/components/static-artifacts/static-artifact-summary"

export function ArtifactWorkspacePage() {
  const { artifactId = "" } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ArtifactDetailResponse | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [scopeSaving, setScopeSaving] = useState(false)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [scopeDraft, setScopeDraft] = useState<
    ArtifactVisibilityScope | undefined
  >()
  const [projectIdDraft, setProjectIdDraft] = useState("")
  const hasLoadedRef = useRef(false)

  const loadDetail = useCallback(
    async (version?: number | null) => {
      if (!artifactId) return
      const initialLoad = !hasLoadedRef.current
      if (initialLoad) setLoading(true)
      setError(null)
      setVersionError(null)
      try {
        const next = await getArtifactDetail(
          artifactId,
          version == null ? {} : { version }
        )
        setDetail(next)
        setSelectedVersion(next.selectedVersion ?? next.currentVersion ?? null)
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load artifact"
        if (initialLoad) setError(message)
        else setVersionError(message)
      } finally {
        if (initialLoad) {
          hasLoadedRef.current = true
          setLoading(false)
        }
      }
    },
    [artifactId]
  )

  useEffect(() => {
    hasLoadedRef.current = false
    void loadDetail(null)
  }, [artifactId, loadDetail])

  useEffect(() => {
    let cancelled = false
    void listProjects()
      .then((items) => {
        if (!cancelled) setProjects(items)
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!detail) return
    setScopeDraft(detail.artifact.visibilityScope)
    setProjectIdDraft(detail.artifact.projectId ?? "")
    setScopeError(null)
  }, [detail])

  const currentVersion = detail?.currentVersion ?? detail?.artifact.currentVersion ?? null
  const viewingHistoricalVersion = useMemo(() => {
    if (!currentVersion || selectedVersion == null) return false
    return selectedVersion !== currentVersion
  }, [currentVersion, selectedVersion])

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/library")
  }

  const handleSelectVersion = (version: number | null) => {
    setVersionError(null)
    if (version == null || version === detail?.currentVersion) {
      void loadDetail(null)
      return
    }
    void loadDetail(version)
  }

  const applyVisibilityScope = async (
    visibilityScope: ArtifactVisibilityScope,
    projectId?: string
  ) => {
    if (!detail) return

    if (visibilityScope === "thread" && !detail.artifact.threadId) {
      setScopeError("Thread scope requires a source thread.")
      return
    }

    setScopeSaving(true)
    setScopeError(null)
    try {
      await updateArtifactVisibility(artifactId, {
        visibilityScope,
        ...(visibilityScope === "project" && projectId ? { projectId } : {}),
        ...(visibilityScope === "thread" && detail.artifact.threadId
          ? { threadId: detail.artifact.threadId }
          : {}),
      })
      await loadDetail(selectedVersion)
    } catch (scopeFailure) {
      setScopeError(
        scopeFailure instanceof Error
          ? scopeFailure.message
          : "Failed to update artifact scope"
      )
    } finally {
      setScopeSaving(false)
    }
  }

  const handleVisibilityScopeChange = async (
    visibilityScope: ArtifactVisibilityScope
  ) => {
    if (!detail) return

    setScopeDraft(visibilityScope)
    setScopeError(null)

    if (visibilityScope === "project") {
      const resolvedProjectId =
        detail.artifact.projectId ?? projectIdDraft.trim()
      if (!resolvedProjectId) return
      if (
        detail.artifact.visibilityScope === "project" &&
        detail.artifact.projectId === resolvedProjectId
      ) {
        return
      }
      await applyVisibilityScope("project", resolvedProjectId)
      return
    }

    if (visibilityScope === detail.artifact.visibilityScope) return
    await applyVisibilityScope(visibilityScope)
  }

  const handleProjectChange = async (projectId: string) => {
    if (!projectId) return
    setProjectIdDraft(projectId)
    setScopeDraft("project")
    await applyVisibilityScope("project", projectId)
  }

  const handleDownload = async () => {
    if (!detail) return
    setDownloadError(null)
    try {
      await downloadArtifactFile(detail.artifact, { version: selectedVersion })
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error ? downloadFailure.message : "Download failed"
      )
    }
  }

  if (loading && !detail) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading artifact…</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">{error ?? "Artifact not found"}</p>
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={handleClose}
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background/95">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-medium">{detail.artifact.title}</h1>
            <Badge variant="outline" className="capitalize">
              {detail.artifact.type}
            </Badge>
            {currentVersion ? <Badge variant="outline">v{currentVersion}</Badge> : null}
            {viewingHistoricalVersion ? <Badge variant="secondary">Historical view</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {staticArtifactSummary(detail)}
            {detail.truncated ? " · Content truncated for safe loading" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={handleClose}>
          Close
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 py-4 sm:px-6 lg:flex-row">
        <main className="min-w-0 flex-1 space-y-4">
          <StaticArtifactPreview detail={detail} />
        </main>
        <ArtifactSidePanel
          artifact={detail.artifact}
          versions={detail.versions}
          currentVersion={currentVersion}
          selectedVersion={selectedVersion}
          viewingHistoricalVersion={viewingHistoricalVersion}
          onSelectVersion={handleSelectVersion}
          onDownload={() => void handleDownload()}
          downloadUrl={artifactDownloadUrl(detail.artifact.id, {
            version: selectedVersion,
          })}
          downloadError={downloadError}
          versionError={versionError}
          projects={projects}
          scopeDraft={scopeDraft}
          projectIdDraft={projectIdDraft}
          scopeControlLabel="Artifact scope"
          onVisibilityScopeChange={(scope) =>
            void handleVisibilityScopeChange(scope)
          }
          onProjectChange={(projectId) => void handleProjectChange(projectId)}
          scopeSaving={scopeSaving}
          scopeError={scopeError}
        />
      </div>
    </div>
  )
}
