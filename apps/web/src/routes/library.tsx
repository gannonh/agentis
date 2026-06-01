import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import type { DocumentPublic as Document, DocumentType, Project } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
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
import {
  documentDownloadUrl,
  listDocuments,
  listProjects,
  uploadDocument,
} from "@/lib/api/projects-client"
import { ApiError } from "@/lib/api/client"

const DOCUMENT_TYPES: DocumentType[] = [
  "markdown",
  "webpage",
  "image",
  "video",
  "table",
  "slides",
  "other",
]

export function LibraryPage() {
  const [searchParams] = useSearchParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">("")
  const [projectFilter, setProjectFilter] = useState(
    () => searchParams.get("projectId") ?? ""
  )
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
  const [detail, setDetail] = useState<{
    document: Document
    content: string | null
    versions: Array<{ id: string; version: number; changeSummary?: string; createdAt: string }>
  } | null>(null)
  const selectedDocumentId = searchParams.get("documentId")

  useEffect(() => {
    const projectId = searchParams.get("projectId")
    if (projectId) {
      setProjectFilter(projectId)
    }
  }, [searchParams])

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current
    setLoading(true)
    setError(null)
    try {
      const [documentList, projectList] = await Promise.all([
        listDocuments({
          query: query.trim() || undefined,
          documentType: typeFilter || undefined,
          projectId: projectFilter || undefined,
        }),
        listProjects(true),
      ])
      if (generation !== loadGeneration.current) return
      setDocuments(documentList)
      setProjects(projectList)
    } catch (loadError) {
      if (generation !== loadGeneration.current) return
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load library"
      )
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false)
      }
    }
  }, [query, typeFilter, projectFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      void load()
    }, 200)
    return () => clearTimeout(timer)
  }, [load])

  const hasFilters = Boolean(query || typeFilter || projectFilter)

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
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload document"
      )
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
    fetch(`/api/documents/${selectedDocumentId}/detail`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load document detail")
        return response.json() as Promise<{
          document: Document
          content: string | null
          versions: Array<{ id: string; version: number; changeSummary?: string; createdAt: string }>
        }>
      })
      .then((nextDetail) => {
        if (!cancelled) setDetail(nextDetail)
      })
      .catch((detailError) => {
        if (!cancelled) {
          setError(
            detailError instanceof Error
              ? detailError.message
              : "Failed to load document detail"
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedDocumentId])

  const handleDownload = async (libraryDocument: Document) => {
    try {
      const response = await fetch(documentDownloadUrl(libraryDocument.id))
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new ApiError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Download failed",
          response.status
        )
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement("a")
      anchor.href = url
      anchor.download = libraryDocument.title
      anchor.click()
      URL.revokeObjectURL(url)
      setDownloadErrors((current) => {
        const next = { ...current }
        delete next[libraryDocument.id]
        return next
      })
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Download failed"
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
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
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
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
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
        <Input
          placeholder="Search documents…"
          className="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search documents"
        />
        <select
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as DocumentType | "")
          }
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          className="border-input bg-background h-9 min-w-40 rounded-md border px-3 text-sm"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("")
              setTypeFilter("")
              setProjectFilter("")
            }}
          >
            Reset filters
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading documents…</p>
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
              {detail.document.documentType} · {detail.document.visibilityScope} · version {detail.document.currentVersion ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.content ? (
              <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                {detail.content}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">No text preview available.</p>
            )}
            <div className="text-muted-foreground text-xs">
              Versions: {detail.versions.map((version) => `v${version.version}`).join(", ") || "none"}
            </div>
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
                <Badge variant="outline" className="shrink-0 text-xs capitalize">
                  {document.documentType}
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
                <p className="text-muted-foreground line-clamp-3 text-xs">
                  {document.previewText}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {document.mimeType} · {(document.sizeBytes / 1024).toFixed(1)}{" "}
                  KB
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {formatRelativeTime(document.createdAt)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownload(document)}
                >
                  Download
                </Button>
              </div>
              {downloadErrors[document.id] ? (
                <p className="text-destructive text-xs">
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
