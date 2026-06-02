import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { DocumentPublic as Document, Project, ThreadListItem } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowLeft01Icon,
  Attachment01Icon,
  Edit01Icon,
  File01Icon,
  Folder01Icon,
  Link01Icon,
  Message01Icon,
  MoreHorizontalIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { AddThreadDialog } from "@/components/projects/add-thread-dialog"
import {
  isProjectDocument,
  isProjectFile,
} from "@/components/projects/project-document-groups"
import { ProjectDocumentsPanel } from "@/components/projects/project-documents-panel"
import { ProjectEditSheet } from "@/components/projects/project-edit-sheet"
import { ProjectThreadsPanel } from "@/components/projects/project-threads-panel"
import { PageLayout } from "@/components/shell/page-layout"
import { listThreads } from "@/lib/api/client"
import { getProject, listDocuments } from "@/lib/api/projects-client"

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [addThreadOpen, setAddThreadOpen] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    setProject(null)
    setThreads([])
    setDocuments([])
    try {
      const [loadedProject, allThreads, projectDocuments] = await Promise.all([
        getProject(projectId),
        listThreads(),
        listDocuments({ projectId }),
      ])
      setProject(loadedProject)
      setThreads(allThreads.filter((thread) => thread.projectId === projectId))
      setDocuments(projectDocuments)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load project"
      )
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const documentDocuments = useMemo(
    () => documents.filter(isProjectDocument),
    [documents]
  )
  const fileDocuments = useMemo(
    () => documents.filter(isProjectFile),
    [documents]
  )

  if (!projectId) {
    return (
      <PageLayout>
        <p className="text-muted-foreground text-sm">Project not found.</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout className="gap-8">
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading project…</p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {project ? (
        <>
          <header className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Back"
                    render={<Link to="/threads/new" />}
                  >
                    <HugeiconsIcon
                      icon={ArrowLeft01Icon}
                      className="size-4"
                      strokeWidth={2}
                    />
                  </Button>
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    className="text-muted-foreground size-5 shrink-0"
                    strokeWidth={2}
                  />
                  <h1 className="truncate text-3xl font-medium tracking-tight">
                    {project.name}
                  </h1>
                </div>
                {project.description ? (
                  <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                    {project.description}
                  </p>
                ) : null}
                {project.goals ? (
                  <div className="text-muted-foreground flex max-w-3xl gap-2 text-sm leading-relaxed">
                    <HugeiconsIcon
                      icon={Target01Icon}
                      className="mt-0.5 size-4 shrink-0"
                      strokeWidth={2}
                    />
                    <p className="whitespace-pre-wrap">{project.goals}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Edit project"
                  onClick={() => setEditOpen(true)}
                >
                  <HugeiconsIcon icon={Edit01Icon} className="size-4" strokeWidth={2} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Project actions"
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      className="size-4"
                      strokeWidth={2}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={
                        <Link
                          to={`/library?projectId=${encodeURIComponent(project.id)}`}
                        />
                      }
                    >
                      Open in Library
                    </DropdownMenuItem>
                    {project.status === "active" ? (
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        Edit project
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to={`/threads/new?projectId=${encodeURIComponent(project.id)}`}
                className="hover:bg-muted/40 flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-colors"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-6"
                  strokeWidth={2}
                />
                <div>
                  <p className="text-sm font-medium">New Thread</p>
                  <p className="text-muted-foreground text-xs">
                    Start a conversation in this project
                  </p>
                </div>
              </Link>
              <button
                type="button"
                className="hover:bg-muted/40 flex flex-col gap-2 rounded-xl border border-border bg-card p-5 text-left transition-colors"
                onClick={() => setAddThreadOpen(true)}
              >
                <HugeiconsIcon
                  icon={Link01Icon}
                  className="size-6"
                  strokeWidth={2}
                />
                <div>
                  <p className="text-sm font-medium">Add Existing Thread</p>
                  <p className="text-muted-foreground text-xs">
                    Link an unassigned thread to this project
                  </p>
                </div>
              </button>
            </div>
          </header>

          <Tabs defaultValue="threads">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-full bg-muted p-1 sm:w-auto">
              <TabsTrigger value="threads" className="rounded-full px-4">
                <HugeiconsIcon
                  icon={Message01Icon}
                  className="mr-1.5 size-3.5"
                  strokeWidth={2}
                />
                Threads ({threads.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-4">
                <HugeiconsIcon
                  icon={File01Icon}
                  className="mr-1.5 size-3.5"
                  strokeWidth={2}
                />
                Documents ({documentDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="rounded-full px-4">
                <HugeiconsIcon
                  icon={Attachment01Icon}
                  className="mr-1.5 size-3.5"
                  strokeWidth={2}
                />
                Files ({fileDocuments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="threads" className="pt-6">
              <ProjectThreadsPanel threads={threads} />
            </TabsContent>
            <TabsContent value="documents" className="pt-6">
              <ProjectDocumentsPanel
                documents={documentDocuments}
                title="Documents"
                emptyMessage="No documents in this project yet."
              />
            </TabsContent>
            <TabsContent value="files" className="pt-6">
              <ProjectDocumentsPanel
                documents={fileDocuments}
                title="Files"
                emptyMessage="No files in this project yet."
              />
            </TabsContent>
          </Tabs>

          <ProjectEditSheet
            projectId={project.id}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={(updated) => {
              setProject(updated)
            }}
            onArchived={() => navigate("/threads/new")}
          />
          <AddThreadDialog
            projectId={project.id}
            open={addThreadOpen}
            onOpenChange={setAddThreadOpen}
            onLinked={() => void load()}
          />
        </>
      ) : null}
    </PageLayout>
  )
}
