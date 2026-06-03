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
  documentTypeSchema,
  type AgentListItem,
  type DocumentDetailResponse,
  type DocumentPublic as Document,
  type DocumentSource,
  type DocumentType,
  type DocumentVisibilityScope,
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
  downloadDocumentFile,
  documentWorkspacePath,
  getDocumentDetail,
  listDocuments,
  listProjects,
  uploadDocument,
} from "@/lib/api/projects-client"

const DOCUMENT_TYPES = documentTypeSchema.options
const AGENT_SOURCE_PREFIX = "agent:"
const PROJECT_SCOPE_PREFIX = "project:"

type DocumentSourceFilter = "" | "user" | "agent" | `agent:${string}`
type DocumentScopeFilter =
  | ""
  | DocumentVisibilityScope
  | "project"
  | `project:${string}`

function sourceFilters(value: DocumentSourceFilter): {
  source?: DocumentSource
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
  visibilityScope?: DocumentVisibilityScope
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

function sourceLabel(value: DocumentSourceFilter, agents: AgentListItem[]) {
  if (value === "user") return "User uploads"
  if (value === "agent") return "Agent generated"
  if (value.startsWith(AGENT_SOURCE_PREFIX)) {
    const agentId = value.slice(AGENT_SOURCE_PREFIX.length)
    return agents.find((agent) => agent.id === agentId)?.name ?? "Agent"
  }
  return "Any source"
}

const DOCUMENT_TYPE_ICONS: Record<DocumentType, IconSvgElement> = {
  markdown: TextAlignLeftIcon,
  webpage: BrowserIcon,
  image: Image01Icon,
  video: Video01Icon,
  table: TableIcon,
  slides: Presentation01Icon,
  other: File01Icon,
}

function typeLabel(value: DocumentType | "") {
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
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">("")
  const [sourceFilter, setSourceFilter] = useState<DocumentSourceFilter>("")
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
  const [uploadType, setUploadType] = useState<DocumentType>("markdown")
  const [uploadProjectId, setUploadProjectId] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>(
    {}
  )
  const [detail, setDetail] = useState<DocumentDetailResponse | null>(null)
  const selectedDocumentId = searchParams.get("documentId")

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
      const [documentList, projectList, agentList, threadList] =
        await Promise.all([
          listDocuments({
            query: query.trim() || undefined,
            documentType: typeFilter || undefined,
            ...sourceFilters(sourceFilter),
            ...scopeFilters(scopeFilter, threadFilter),
          }),
          listProjects(true),
          listAgents(),
          listThreads(),
        ])
      if (generation !== loadGeneration.current) return
      setDocuments(documentList)
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
    () => !loading && documents.length === 0 && hasFilters,
    [documents.length, hasFilters, loading]
  )

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) return
    setUploading(true)
    setError(null)
    try {
      await uploadDocument({
        title: uploadTitle.trim(),
        documentType: uploadType,
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
    if (!selectedDocumentId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetail(null)
    setError(null)
    getDocumentDetail(selectedDocumentId)
      .then((nextDetail) => {
        if (!cancelled) setDetail(nextDetail)
      })
      .catch((detailError) => {
        if (!cancelled) {
          setError(errorMessage(detailError, "Failed to load document detail"))
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedDocumentId])

  const handleDownload = async (libraryDocument: Document) => {
    try {
      await downloadDocumentFile(libraryDocument)
      setDownloadErrors((current) => {
        const next = { ...current }
        delete next[libraryDocument.id]
        return next
      })
    } catch (downloadError) {
      const message = errorMessage(downloadError, "Download failed")
      setDownloadErrors((current) => ({
        ...current,
        [libraryDocument.id]: message,
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
              Upload document
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload document</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <Input
                  placeholder="Title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={uploadType}
                  onChange={(e) =>
                    setUploadType(e.target.value as DocumentType)
                  }
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
            placeholder="Search documents…"
            className="pl-7"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search documents"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-40"
                aria-label="Filter by type"
              />
            }
          >
            <span className="truncate capitalize">{typeLabel(typeFilter)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44">
            <DropdownMenuRadioGroup
              value={typeFilter || "all"}
              onValueChange={(value) =>
                setTypeFilter(value === "all" ? "" : (value as DocumentType))
              }
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                <DropdownMenuRadioItem value="all">
                  <MenuIcon icon={FolderLibraryIcon} />
                  All types
                </DropdownMenuRadioItem>
                {DOCUMENT_TYPES.map((type) => (
                  <DropdownMenuRadioItem key={type} value={type}>
                    <MenuIcon icon={DOCUMENT_TYPE_ICONS[type]} />
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
                  value === "all" ? "" : (value as DocumentSourceFilter)
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
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : null}

      {!loading && documents.length === 0 && !hasFilters ? (
        <EmptyState
          title="No documents yet"
          description="Upload a file or ask an agent to create a document in a project thread."
        />
      ) : null}

      {filteredEmpty ? (
        <EmptyState
          title="No matching documents"
          description="Try adjusting search or filters."
        />
      ) : null}

      {detail ? (
        <Card>
          <CardHeader>
            <CardTitle>{detail.document.title}</CardTitle>
            <CardDescription>
              {detail.document.documentType} · {detail.document.visibilityScope}{" "}
              · version {detail.document.currentVersion ?? "—"}
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
            <Button
              render={
                <Link to={documentWorkspacePath(detail.document.id)} />
              }
            >
              Open document
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <Card key={document.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-snug">
                  {document.title}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="shrink-0 text-xs capitalize"
                >
                  {document.documentType} · {document.visibilityScope}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {[
                  document.projectNameSnapshot,
                  document.threadTitleSnapshot,
                  document.agentNameSnapshot,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Workspace"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {document.previewText ? (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {document.previewText}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {document.mimeType} · {(document.sizeBytes / 1024).toFixed(1)}{" "}
                  KB
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(document.updatedAt)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link to={documentWorkspacePath(document.id)} />
                    }
                  >
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDownload(document)}
                  >
                    Download
                  </Button>
                </div>
              </div>
              {downloadErrors[document.id] ? (
                <p className="text-xs text-destructive">
                  {downloadErrors[document.id]}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  )
}
