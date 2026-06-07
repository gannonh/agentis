import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BrowserIcon,
  BubbleChatIcon,
  CloudUploadIcon,
  File01Icon,
  FilterHorizontalIcon,
  Folder01Icon,
  FolderLibraryIcon,
  Globe02Icon,
  Image01Icon,
  Presentation01Icon,
  Robot01Icon,
  TableIcon,
  TextAlignLeftIcon,
  UserIcon,
  Video01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useSearchParams, Link } from "react-router"
import {
  artifactTypeSchema,
  type AgentListItem,
  type ArtifactDetailResponse,
  type ArtifactPublic as Artifact,
  type ArtifactSource,
  type ArtifactType,
  type ArtifactVisibilityScope,
  type Project,
  type ThreadListItem,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { formatRelativeTime } from "@/fixtures"
import { listThreads } from "@/lib/api/client"
import { listAgents } from "@/lib/api/agents-client"
import {
  artifactLaunchLabel,
  artifactLaunchPath,
  downloadArtifactFile,
  getArtifactDetail,
  listArtifacts,
  listProjects,
  uploadDocument,
} from "@/lib/api/projects-client"

const ARTIFACT_TYPES = artifactTypeSchema.options
const AGENT_SOURCE_PREFIX = "agent:"
const PROJECT_SCOPE_PREFIX = "project:"

type ArtifactSourceFilter = "" | "user" | "agent" | `agent:${string}`
type DocumentScopeFilter =
  | ""
  | ArtifactVisibilityScope
  | "project"
  | `project:${string}`

function isMarkdownUpload(file: File) {
  const filename = file.name.toLowerCase()
  return (
    file.type === "text/markdown" ||
    filename.endsWith(".md") ||
    filename.endsWith(".markdown")
  )
}

function sourceFilters(value: ArtifactSourceFilter): {
  source?: ArtifactSource
  agentId?: string
} {
  if (value === "user") return { source: "user" }
  if (value === "agent") return { source: "agent" }
  if (value.startsWith(AGENT_SOURCE_PREFIX)) {
    return { source: "agent", agentId: value.slice(AGENT_SOURCE_PREFIX.length) }
  }
  return {}
}

function scopeFilters(
  value: DocumentScopeFilter,
  threadId: string
): {
  visibilityScope?: ArtifactVisibilityScope
  projectId?: string
  threadId?: string
} {
  if (value === "global") return { visibilityScope: "global" }
  if (value === "project") return { visibilityScope: "project" }
  if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
    return {
      visibilityScope: "project",
      projectId: value.slice(PROJECT_SCOPE_PREFIX.length),
    }
  }
  if (value === "thread") {
    return {
      visibilityScope: "thread",
      threadId: threadId || undefined,
    }
  }
  return {}
}

function MenuIcon({ icon }: { icon: IconSvgElement }) {
  return (
    <HugeiconsIcon
      icon={icon}
      className="size-3.5"
      strokeWidth={2}
      aria-hidden
    />
  )
}

function sourceLabel(value: ArtifactSourceFilter, agents: AgentListItem[]) {
  if (value === "user") return "User uploads"
  if (value === "agent") return "Agent generated"
  if (value.startsWith(AGENT_SOURCE_PREFIX)) {
    const agentId = value.slice(AGENT_SOURCE_PREFIX.length)
    return agents.find((agent) => agent.id === agentId)?.name ?? "Agent"
  }
  return "Any source"
}

const ARTIFACT_TYPE_ICONS: Record<ArtifactType, IconSvgElement> = {
  document: TextAlignLeftIcon,
  webpage: BrowserIcon,
  slides: Presentation01Icon,
  app: File01Icon,
  table: TableIcon,
  image: Image01Icon,
  video: Video01Icon,
  other: File01Icon,
}

function typeLabel(value: ArtifactType | "") {
  return value || "All types"
}

function scopeLabel(value: DocumentScopeFilter, projects: Project[]) {
  if (value === "global") return "Global"
  if (value === "project") return "All projects"
  if (value === "thread") return "Threads"
  if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
    const projectId = value.slice(PROJECT_SCOPE_PREFIX.length)
    return (
      projects.find((project) => project.id === projectId)?.name ?? "Project"
    )
  }
  return "Any scope"
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function LibraryPage() {
  const [searchParams] = useSearchParams()
  const initialProjectId = searchParams.get("projectId") ?? ""
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<ArtifactType | "">("")
  const [sourceFilter, setSourceFilter] = useState<ArtifactSourceFilter>("")
  const [scopeFilter, setScopeFilter] = useState<DocumentScopeFilter>(
    initialProjectId ? `${PROJECT_SCOPE_PREFIX}${initialProjectId}` : ""
  )
  const [threadSearch, setThreadSearch] = useState("")
  const [threadFilter, setThreadFilter] = useState("")
  const loadGeneration = useRef(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadProjectId, setUploadProjectId] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>(
    {}
  )
  const [detail, setDetail] = useState<ArtifactDetailResponse | null>(null)
  const selectedArtifactId =
    searchParams.get("artifactId") ?? searchParams.get("documentId")

  useEffect(() => {
    const projectId = searchParams.get("projectId")
    if (projectId) {
      setScopeFilter(`${PROJECT_SCOPE_PREFIX}${projectId}`)
    }
  }, [searchParams])

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current
    setLoading(true)
    setError(null)
    try {
      const [artifactList, projectList, agentList, threadList] =
        await Promise.all([
          listArtifacts({
            query: query.trim() || undefined,
            type: typeFilter || undefined,
            ...sourceFilters(sourceFilter),
            ...scopeFilters(scopeFilter, threadFilter),
          }),
          listProjects(true),
          listAgents(),
          listThreads(),
        ])
      if (generation !== loadGeneration.current) return
      setArtifacts(artifactList)
      setProjects(projectList)
      setAgents(agentList)
      setThreads(threadList)
    } catch (loadError) {
      if (generation !== loadGeneration.current) return
      setError(errorMessage(loadError, "Failed to load library"))
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false)
      }
    }
  }, [query, typeFilter, sourceFilter, scopeFilter, threadFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      void load()
    }, 200)
    return () => clearTimeout(timer)
  }, [load])

  const hasFilters = Boolean(
    query || typeFilter || sourceFilter || scopeFilter || threadFilter
  )

  const threadOptions = useMemo(() => {
    const term = threadSearch.trim().toLowerCase()
    const filtered = term
      ? threads.filter((thread) => thread.title.toLowerCase().includes(term))
      : threads
    return filtered.slice(0, 25)
  }, [threadSearch, threads])

  const filteredEmpty = useMemo(
    () => !loading && artifacts.length === 0 && hasFilters,
    [artifacts.length, hasFilters, loading]
  )

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) return
    if (!isMarkdownUpload(uploadFile)) {
      setError("Please choose a markdown (.md or .markdown) file")
      return
    }
    setUploading(true)
    setError(null)
    try {
      await uploadDocument({
        title: uploadTitle.trim(),
        documentType: "document",
        file: uploadFile,
        projectId: uploadProjectId || undefined,
      })
      setUploadOpen(false)
      setUploadTitle("")
      setUploadFile(null)
      setUploadProjectId("")
      await load()
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Failed to upload document"))
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!selectedArtifactId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetail(null)
    setError(null)
    getArtifactDetail(selectedArtifactId)
      .then((nextDetail) => {
        if (!cancelled) setDetail(nextDetail)
      })
      .catch((detailError) => {
        if (!cancelled) {
          setError(errorMessage(detailError, "Failed to load artifact detail"))
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedArtifactId])

  const handleDownload = async (artifact: Artifact) => {
    try {
      await downloadArtifactFile(artifact)
      setDownloadErrors((current) => {
        const next = { ...current }
        delete next[artifact.id]
        return next
      })
    } catch (downloadError) {
      const message = errorMessage(downloadError, "Download failed")
      setDownloadErrors((current) => ({
        ...current,
        [artifact.id]: message,
      }))
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Library"
        description="Browse deliverables produced across threads and agent runs."
        actions={
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              Upload markdown document
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload markdown document</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <Input
                  placeholder="Title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(e.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.status === "archived" ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
                <Input
                  type="file"
                  accept=".md,.markdown,text/markdown"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={!uploadTitle.trim() || !uploadFile || uploading}
                  onClick={() => void handleUpload()}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="hidden text-muted-foreground sm:flex" aria-hidden>
          <HugeiconsIcon
            icon={FilterHorizontalIcon}
            className="size-4"
            strokeWidth={2}
          />
        </div>
        <div className="relative w-full sm:max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <Input
            placeholder="Search artifacts…"
            className="pl-7"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search artifacts"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-40"
                aria-label="Filter by artifact type"
              />
            }
          >
            <span className="truncate capitalize">{typeLabel(typeFilter)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuRadioGroup
              value={typeFilter || "all"}
              onValueChange={(value) =>
                setTypeFilter(value === "all" ? "" : (value as ArtifactType))
              }
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                <DropdownMenuRadioItem value="all">
                  <MenuIcon icon={FolderLibraryIcon} />
                  All types
                </DropdownMenuRadioItem>
                {ARTIFACT_TYPES.map((type) => (
                  <DropdownMenuRadioItem key={type} value={type}>
                    <MenuIcon icon={ARTIFACT_TYPE_ICONS[type]} />
                    <span className="capitalize">{type}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-48"
                aria-label="Filter by source"
              />
            }
          >
            <span className="truncate">
              {sourceLabel(sourceFilter, agents)}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuRadioGroup
              value={sourceFilter || "all"}
              onValueChange={(value) =>
                setSourceFilter(
                  value === "all" ? "" : (value as ArtifactSourceFilter)
                )
              }
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Source</DropdownMenuLabel>
                <DropdownMenuRadioItem value="all">
                  <MenuIcon icon={FolderLibraryIcon} />
                  Any source
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="user">
                  <MenuIcon icon={CloudUploadIcon} />
                  User uploads
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="agent">
                  <MenuIcon icon={Robot01Icon} />
                  Agent generated
                </DropdownMenuRadioItem>
              </DropdownMenuGroup>
              {agents.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Agents</DropdownMenuLabel>
                    {agents.map((agent) => (
                      <DropdownMenuRadioItem
                        key={agent.id}
                        value={`${AGENT_SOURCE_PREFIX}${agent.id}`}
                      >
                        <MenuIcon icon={UserIcon} />
                        {agent.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              ) : null}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-48"
                aria-label="Filter by scope"
              />
            }
          >
            <span className="truncate">
              {scopeLabel(scopeFilter, projects)}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuRadioGroup
              value={scopeFilter || "all"}
              onValueChange={(value) => {
                setScopeFilter(
                  value === "all" ? "" : (value as DocumentScopeFilter)
                )
                setThreadSearch("")
                setThreadFilter("")
              }}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Scope</DropdownMenuLabel>
                <DropdownMenuRadioItem value="all">
                  <MenuIcon icon={FolderLibraryIcon} />
                  Any scope
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="global">
                  <MenuIcon icon={Globe02Icon} />
                  Global
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="project">
                  <MenuIcon icon={Folder01Icon} />
                  All projects
                </DropdownMenuRadioItem>
              </DropdownMenuGroup>
              {projects.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Projects</DropdownMenuLabel>
                    {projects.map((project) => (
                      <DropdownMenuRadioItem
                        key={project.id}
                        value={`${PROJECT_SCOPE_PREFIX}${project.id}`}
                      >
                        <MenuIcon icon={Folder01Icon} />
                        {project.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuRadioItem value="thread">
                  <MenuIcon icon={BubbleChatIcon} />
                  Threads
                </DropdownMenuRadioItem>
              </DropdownMenuGroup>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {scopeFilter === "thread" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search threads…"
              className="max-w-48"
              value={threadSearch}
              onChange={(e) => {
                setThreadSearch(e.target.value)
                setThreadFilter("")
              }}
              aria-label="Search threads"
            />
            <select
              className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"
              value={threadFilter}
              onChange={(e) => setThreadFilter(e.target.value)}
              aria-label="Filter by thread"
            >
              <option value="">Any thread</option>
              {threadOptions.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("")
              setTypeFilter("")
              setSourceFilter("")
              setScopeFilter("")
              setThreadSearch("")
              setThreadFilter("")
            }}
          >
            Reset filters
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading artifacts…</p>
      ) : null}

      {!loading && artifacts.length === 0 && !hasFilters ? (
        <EmptyState
          title="No artifacts yet"
          description="Upload a markdown document or ask an agent to create an artifact in a project thread."
        />
      ) : null}

      {filteredEmpty ? (
        <EmptyState
          title="No matching artifacts"
          description="Try adjusting search or filters."
        />
      ) : null}

      {detail ? (
        <Card>
          <CardHeader>
            <CardTitle>{detail.artifact.title}</CardTitle>
            <CardDescription>
              {detail.artifact.type} · {detail.artifact.visibilityScope} · version{" "}
              {detail.artifact.currentVersion ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.content ? (
              <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                {detail.content}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                No text preview available.
              </p>
            )}
            <div className="text-xs text-muted-foreground">
              Versions:{" "}
              {detail.versions
                .map((version) => `v${version.version}`)
                .join(", ") || "none"}
            </div>
            {(() => {
              const launchPath = artifactLaunchPath(detail.artifact)
              const launchLabel = artifactLaunchLabel(detail.artifact.type)
              return launchPath && launchLabel ? (
                <Button
                  nativeButton={false}
                  render={<Link to={launchPath} />}
                >
                  {launchLabel}
                </Button>
              ) : null
            })()}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artifacts.map((artifact) => {
          const launchPath = artifactLaunchPath(artifact)
          const launchLabel = artifactLaunchLabel(artifact.type)

          return (
          <Card key={artifact.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-snug">
                  {launchPath ? (
                    <Link to={launchPath} className="hover:underline">
                      {artifact.title}
                    </Link>
                  ) : (
                    artifact.title
                  )}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="shrink-0 text-xs capitalize"
                >
                  {artifact.type} · {artifact.visibilityScope}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {[
                  artifact.projectNameSnapshot,
                  artifact.threadTitleSnapshot,
                  artifact.agentNameSnapshot,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Workspace"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {artifact.previewText ? (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {artifact.previewText}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {artifact.mimeType} · {(artifact.sizeBytes / 1024).toFixed(1)}{" "}
                  KB
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(artifact.updatedAt)}
                </span>
                <div className="flex items-center gap-2">
                  {launchPath && launchLabel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link to={launchPath} />}
                    >
                      {launchLabel}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDownload(artifact)}
                  >
                    Download
                  </Button>
                </div>
              </div>
              {downloadErrors[artifact.id] ? (
                <p className="text-xs text-destructive">
                  {downloadErrors[artifact.id]}
                </p>
              ) : null}
            </CardContent>
          </Card>
          )
        })}
      </div>
    </PageLayout>
  )
}
