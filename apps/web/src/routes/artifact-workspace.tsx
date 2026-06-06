import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import type { ArtifactDetailResponse } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatRelativeTime } from "@/fixtures"
import {
  artifactDownloadUrl,
  downloadArtifactFile,
  getArtifactDetail,
} from "@/lib/api/projects-client"
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

  const sortedVersions = [...detail.versions].sort(
    (left, right) => right.version - left.version
  )

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
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Source &amp; Scope</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Scope</dt>
                <dd className="capitalize">{detail.artifact.visibilityScope}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Updated</dt>
                <dd>{formatRelativeTime(detail.artifact.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Provenance</dt>
                <dd className="text-muted-foreground">
                  {[
                    detail.artifact.projectNameSnapshot,
                    detail.artifact.threadTitleSnapshot,
                    detail.artifact.agentNameSnapshot,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Workspace"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Actions</h2>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleDownload}>
                Download
              </Button>
              <a
                href={artifactDownloadUrl(detail.artifact.id, {
                  version: selectedVersion,
                })}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Direct download link
              </a>
              {downloadError ? (
                <p className="text-xs text-destructive">{downloadError}</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Version history</h2>
              {viewingHistoricalVersion ? (
                <Button size="sm" variant="ghost" onClick={() => handleSelectVersion(null)}>
                  Back to current
                </Button>
              ) : null}
            </div>
            {versionError ? <p className="text-xs text-destructive">{versionError}</p> : null}
            {sortedVersions.length ? (
              <div className="flex flex-col gap-1">
                {sortedVersions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    aria-label={`Version ${version.version}`}
                    onClick={() => handleSelectVersion(version.version)}
                    className="flex w-full flex-col gap-1 rounded-md border border-transparent px-2 py-2 text-left hover:bg-muted/60 data-[selected=true]:border-primary/40 data-[selected=true]:bg-primary/5"
                    data-selected={version.version === selectedVersion}
                  >
                    <span className="text-sm font-medium">v{version.version}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(version.createdAt)}
                      {version.changeSummary ? ` · ${version.changeSummary}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No versions recorded.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
