import { useCallback, useEffect, useState } from "react"
import type { Project, ProjectMemory } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Textarea } from "@workspace/ui/components/textarea"
import { ProjectDetailsFields } from "@/components/projects/project-details-fields"
import {
  archiveProject,
  createProjectMemory,
  deleteProjectMemory,
  getProject,
  listProjectMemories,
  updateProject,
  updateProjectMemory,
} from "@/lib/api/projects-client"

type ProjectEditSheetProps = {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (project: Project) => void
  onArchived?: () => void
}

export function ProjectEditSheet({
  projectId,
  open,
  onOpenChange,
  onSaved,
  onArchived,
}: ProjectEditSheetProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [memories, setMemories] = useState<ProjectMemory[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [goals, setGoals] = useState("")
  const [newMemory, setNewMemory] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
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
    if (open) {
      void load()
    }
  }, [load, open])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateProject(projectId, {
        name: name.trim(),
        description: description.trim() || null,
        goals: goals.trim() || null,
      })
      setProject(updated)
      onSaved?.(updated)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save project"
      )
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    setSaving(true)
    try {
      await archiveProject(projectId)
      onOpenChange(false)
      onArchived?.()
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
    if (!newMemory.trim()) return
    const memory = await createProjectMemory(projectId, {
      content: newMemory.trim(),
      enabled: true,
    })
    setMemories((current) => [memory, ...current])
    setNewMemory("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
          <SheetDescription>
            Update details, memories, or archive this project.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <ProjectDetailsFields
            name={name}
            onNameChange={setName}
            description={description}
            onDescriptionChange={setDescription}
            goals={goals}
            onGoalsChange={setGoals}
            nameRequired
          />

          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-medium">Project memories</h3>
              <p className="text-muted-foreground text-xs">
                Enabled memories are included in run context.
              </p>
            </div>
            <InputGroup>
              <InputGroupInput
                placeholder="Add a memory…"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleAddMemory()
                  }
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  disabled={!newMemory.trim()}
                  onClick={() => void handleAddMemory()}
                >
                  Add
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
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
          </div>

          <div className="flex justify-between gap-2 border-t border-border pt-4">
            {project?.status === "active" ? (
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
