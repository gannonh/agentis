import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Link } from "react-router"
import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  ArtifactDetailResponse,
  ArtifactPublic as Artifact,
  DocumentDetailResponse,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { DocumentViewer } from "@/components/documents/document-viewer"
import { StaticArtifactPreview } from "@/components/static-artifacts/static-artifact-preview"
import { formatRelativeTime } from "@/fixtures"
import {
  artifactLaunchLabel,
  artifactLaunchPath,
  getArtifactDetail,
  getDocumentDetail,
  listArtifacts,
} from "@/lib/api/projects-client"

type WorkingArtifactsRailProviderProps = {
  threadId: string
  refreshKey?: string
  children: ReactNode
}

type WorkingArtifactsRailContextValue = {
  sortedArtifacts: Artifact[]
  loading: boolean
  error: string | null
  selectedId: string | null
  selectArtifact: (id: string) => void
  selectedArtifact: Artifact | null
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const WorkingArtifactsRailContext =
  createContext<WorkingArtifactsRailContextValue | null>(null)

function useWorkingArtifactsRail() {
  const value = useContext(WorkingArtifactsRailContext)
  if (!value) {
    throw new Error(
      "Working artifacts rail components must be used within WorkingArtifactsRailProvider"
    )
  }
  return value
}

function artifactMetadata(artifact: Artifact) {
  return [
    artifact.type,
    artifact.contentFormat,
    artifact.currentVersion ? `v${artifact.currentVersion}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

function isPreviewableArtifact(artifact: Artifact) {
  return (
    (artifact.type === "document" && artifact.contentFormat === "markdown") ||
    artifact.type === "webpage" ||
    artifact.type === "slides"
  )
}

function resolveSelection(
  sortedArtifacts: Artifact[],
  currentId: string | null
): string | null {
  if (currentId && sortedArtifacts.some((artifact) => artifact.id === currentId)) {
    return currentId
  }
  const previewable = sortedArtifacts.find(isPreviewableArtifact)
  if (previewable) return previewable.id
  return sortedArtifacts[0]?.id ?? null
}

export function WorkingArtifactsRailProvider({
  threadId,
  refreshKey,
  children,
}: WorkingArtifactsRailProviderProps) {
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <WorkingArtifactsRailProviderLoaded
      key={`${threadId}:${refreshKey ?? ""}`}
      threadId={threadId}
      userSelectedId={userSelectedId}
      onSelectArtifact={setUserSelectedId}
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
    >
      {children}
    </WorkingArtifactsRailProviderLoaded>
  )
}

function WorkingArtifactsRailProviderLoaded({
  threadId,
  userSelectedId,
  onSelectArtifact,
  mobileOpen,
  onMobileOpenChange,
  children,
}: {
  threadId: string
  userSelectedId: string | null
  onSelectArtifact: (id: string) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listArtifacts({ threadId })
      .then((items) => {
        if (!cancelled) {
          setArtifacts(items)
          setError(null)
        }
      })
      .catch((failure) => {
        if (!cancelled) {
          setArtifacts([])
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load working artifacts."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [threadId])

  const sortedArtifacts = useMemo(
    () =>
      [...artifacts].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [artifacts]
  )

  const selectedId = useMemo(
    () => resolveSelection(sortedArtifacts, userSelectedId),
    [sortedArtifacts, userSelectedId]
  )

  const selectedArtifact = useMemo(
    () => sortedArtifacts.find((artifact) => artifact.id === selectedId) ?? null,
    [sortedArtifacts, selectedId]
  )

  const selectArtifact = useCallback(
    (id: string) => {
      onSelectArtifact(id)
    },
    [onSelectArtifact]
  )

  const setMobileOpen = useCallback(
    (open: boolean) => {
      onMobileOpenChange(open)
    },
    [onMobileOpenChange]
  )

  const value = useMemo(
    () => ({
      sortedArtifacts,
      loading,
      error,
      selectedId,
      selectArtifact,
      selectedArtifact,
      mobileOpen,
      setMobileOpen,
    }),
    [
      sortedArtifacts,
      loading,
      error,
      selectedId,
      selectArtifact,
      selectedArtifact,
      mobileOpen,
      setMobileOpen,
    ]
  )

  return (
    <WorkingArtifactsRailContext.Provider value={value}>
      {children}
    </WorkingArtifactsRailContext.Provider>
  )
}

function PreviewTruncatedNotice({ workspace }: { workspace: "document" | "artifact" }) {
  const label =
    workspace === "document" ? "document workspace" : "artifact workspace"
  return (
    <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
      Preview truncated. Open the {label} for the full content.
    </p>
  )
}

function WorkingArtifactPreviewLoader({ artifact }: { artifact: Artifact }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documentDetail, setDocumentDetail] =
    useState<DocumentDetailResponse | null>(null)
  const [artifactDetail, setArtifactDetail] =
    useState<ArtifactDetailResponse | null>(null)
  const requestRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestRef.current

    const onFailure = (failure: unknown) => {
      if (requestId !== requestRef.current) return
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load artifact preview."
      )
    }
    const onFinally = () => {
      if (requestId === requestRef.current) setLoading(false)
    }

    if (artifact.type === "document") {
      void getDocumentDetail(artifact.id)
        .then((detail) => {
          if (requestId !== requestRef.current) return
          setDocumentDetail(detail)
          setError(null)
        })
        .catch(onFailure)
        .finally(onFinally)
      return
    }

    void getArtifactDetail(artifact.id)
      .then((detail) => {
        if (requestId !== requestRef.current) return
        setArtifactDetail(detail)
        setError(null)
      })
      .catch(onFailure)
      .finally(onFinally)
  }, [artifact.id, artifact.type, artifact.updatedAt])

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">Loading preview...</p>
    )
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>
  }

  if (artifact.type === "document" && documentDetail) {
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        {documentDetail.truncated ? (
          <PreviewTruncatedNotice workspace="document" />
        ) : null}
        <DocumentViewer
          mode="preview"
          content={documentDetail.content ?? ""}
        />
      </div>
    )
  }

  if (artifactDetail) {
    return (
      <div className="rounded-lg border border-border bg-background p-3 [&_iframe]:!h-48 [&_iframe]:!min-h-48">
        {artifactDetail.truncated ? (
          <PreviewTruncatedNotice workspace="artifact" />
        ) : null}
        <StaticArtifactPreview detail={artifactDetail} />
      </div>
    )
  }

  return null
}

function WorkingArtifactPreview({ artifact }: { artifact: Artifact }) {
  if (!isPreviewableArtifact(artifact)) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
        Preview unavailable for this artifact type. Open the workspace to view it.
      </div>
    )
  }

  return (
    <WorkingArtifactPreviewLoader
      key={`${artifact.id}:${artifact.updatedAt}`}
      artifact={artifact}
    />
  )
}

function WorkingArtifactPreviewSection({
  artifact,
  className,
}: {
  artifact: Artifact
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const contentId = `working-artifact-preview-${artifact.id}`

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-t border-border pt-3",
        expanded ? "flex-1" : "shrink-0",
        className
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex shrink-0 items-center gap-2 text-left"
        onClick={() => setExpanded((value) => !value)}
      >
        <HugeiconsIcon
          icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
          className="size-3.5 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <span className="text-sm font-medium">Preview</span>
      </button>
      {expanded ? (
        <div id={contentId} className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <WorkingArtifactPreview artifact={artifact} />
        </div>
      ) : null}
    </div>
  )
}

type WorkingArtifactsRailPanelProps = {
  className?: string
  listClassName?: string
  previewClassName?: string
}

function WorkingArtifactsRailPanel({
  className,
  listClassName,
  previewClassName,
}: WorkingArtifactsRailPanelProps) {
  const {
    sortedArtifacts,
    loading,
    error,
    selectedId,
    selectArtifact,
    selectedArtifact,
  } = useWorkingArtifactsRail()

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col gap-3 bg-card/40 p-4",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Working artifacts</h2>
        {sortedArtifacts.length ? (
          <span className="rounded-full border border-border bg-input/20 px-2 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
            {sortedArtifacts.length}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading artifacts...</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!loading && !error && sortedArtifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No working artifacts yet.
        </p>
      ) : null}
      {!loading && sortedArtifacts.length ? (
        <ul
          className={cn(
            "flex min-h-0 flex-col gap-2 overflow-y-auto",
            listClassName
          )}
        >
          {sortedArtifacts.map((artifact) => {
            const launchPath = artifactLaunchPath(artifact)
            const launchLabel = artifactLaunchLabel(artifact.type)
            const selected = artifact.id === selectedId

            return (
              <li
                key={artifact.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <button
                  type="button"
                  onClick={() => selectArtifact(artifact.id)}
                  className="w-full text-left"
                >
                  <p className="font-medium leading-snug">{artifact.title}</p>
                  <p className="mt-1 text-muted-foreground">
                    {artifactMetadata(artifact)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Updated {formatRelativeTime(artifact.updatedAt)}
                  </p>
                </button>
                {launchPath && launchLabel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    nativeButton={false}
                    render={<Link to={launchPath} />}
                  >
                    {launchLabel}
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {selectedArtifact ? (
        <WorkingArtifactPreviewSection
          artifact={selectedArtifact}
          className={previewClassName}
        />
      ) : null}
    </section>
  )
}

export function WorkingArtifactsRailMobile() {
  const { sortedArtifacts, loading, mobileOpen, setMobileOpen } =
    useWorkingArtifactsRail()

  const countLabel =
    loading && sortedArtifacts.length === 0
      ? "…"
      : String(sortedArtifacts.length)

  return (
    <div className="border-b border-border lg:hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span>Working artifacts</span>
          <span className="text-muted-foreground">{countLabel}</span>
        </Button>
      </div>
      {mobileOpen ? (
        <div
          data-testid="working-artifacts-mobile-panel"
          className="max-h-[min(60vh,28rem)] overflow-y-auto"
        >
          <WorkingArtifactsRailPanel className="border-t border-border" />
        </div>
      ) : null}
    </div>
  )
}

export function WorkingArtifactsRailSidebar({
  className,
}: {
  className?: string
}) {
  return (
    <WorkingArtifactsRailPanel
      className={cn("min-h-0 w-full flex-1", className)}
      listClassName="min-h-0 flex-1"
    />
  )
}

/** @deprecated Use WorkingArtifactsRailProvider + sidebar/mobile parts */
export function ThreadDurableArtifacts(props: WorkingArtifactsRailProviderProps) {
  return (
    <WorkingArtifactsRailProvider {...props}>
      <WorkingArtifactsRailSidebar />
    </WorkingArtifactsRailProvider>
  )
}
