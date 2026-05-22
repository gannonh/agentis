import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { Project, ProjectMemory } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import {
  archiveProject,
  createProjectMemory,
  deleteProjectMemory,
  getProject,
  listProjectMemories,
  updateProject,
  updateProjectMemory,
} from "@/lib/api/projects-client"

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [memories, setMemories] = useState<ProjectMemory[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [goals, setGoals] = useState("")
  const [newMemory, setNewMemory] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [loadedProject, loadedMemories] = await Promise.all([
        getProject(projectId),
        listProjectMemories(projectId),
      ])
      setProject(loadedProject)
      setMemories(loadedMemories)
      setName(loadedProject.name)
      setDescription(loadedProject.description ?? "")
      setGoals(loadedProject.goals ?? "")
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

  const handleSave = async () => {
    if (!projectId) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateProject(projectId, {
        name: name.trim(),
        description: description.trim() || null,
        goals: goals.trim() || null,
      })
      setProject(updated)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save project"
      )
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!projectId) return
    setSaving(true)
    try {
      await archiveProject(projectId)
      navigate("/threads/new")
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive project"
      )
    } finally {
      setSaving(false)
    }
  }

  const handleAddMemory = async () => {
    if (!projectId || !newMemory.trim()) return
    const memory = await createProjectMemory(projectId, {
      content: newMemory.trim(),
      enabled: true,
    })
    setMemories((current) => [memory, ...current])
    setNewMemory("")
  }

  if (!projectId) {
    return (
      <PageLayout>
        <p className="text-muted-foreground text-sm">Project not found.</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout variant="narrow">
      <PageHeader
        title={project?.name ?? "Project"}
        description="Edit project details, memories, and archive status."
      />

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading project…</p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {project ? (
        <>
          <div className="flex items-center gap-2">
            {project.status === "archived" ? (
              <Badge variant="secondary">Archived</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to={`/threads/new?projectId=${encodeURIComponent(project.id)}`}
                />
              }
            >
              Start thread
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                Name, description, and goals used in thread context.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="edit-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="edit-goals" className="text-sm font-medium">
                  Goals
                </label>
                <Textarea
                  id="edit-goals"
                  rows={4}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              {project.status === "active" ? (
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleArchive()}
                >
                  Archive project
                </Button>
              ) : (
                <span />
              )}
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project memories</CardTitle>
              <CardDescription>
                Enabled memories are included in run context.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a memory…"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!newMemory.trim()}
                  onClick={() => void handleAddMemory()}
                >
                  Add
                </Button>
              </div>
              {memories.length === 0 ? (
                <p className="text-muted-foreground text-sm">No memories yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {memories.map((memory) => (
                    <li
                      key={memory.id}
                      className="border-border flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <Textarea
                        rows={2}
                        defaultValue={memory.content}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && value !== memory.content) {
                            void updateProjectMemory(projectId, memory.id, {
                              content: value,
                            }).then((updated) => {
                              setMemories((current) =>
                                current.map((item) =>
                                  item.id === memory.id ? updated : item
                                )
                              )
                            })
                          }
                        }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={memory.enabled}
                            onChange={(e) => {
                              void updateProjectMemory(projectId, memory.id, {
                                enabled: e.target.checked,
                              }).then((updated) => {
                                setMemories((current) =>
                                  current.map((item) =>
                                    item.id === memory.id ? updated : item
                                  )
                                )
                              })
                            }}
                          />
                          Enabled for context
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void deleteProjectMemory(projectId, memory.id).then(
                              () => {
                                setMemories((current) =>
                                  current.filter((item) => item.id !== memory.id)
                                )
                              }
                            )
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </PageLayout>
  )
}
