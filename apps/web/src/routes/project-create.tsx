import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { PROJECT_DETAILS_DESCRIPTION } from "@/components/projects/project-details-description"
import { ProjectDetailsFields } from "@/components/projects/project-details-fields"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { createProject } from "@/lib/api/projects-client"

export function ProjectCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [goals, setGoals] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        goals: goals.trim() || undefined,
      })
      navigate(`/threads/new?projectId=${encodeURIComponent(project.id)}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create project"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout variant="focused" className="gap-6">
      <PageHeader
        title="New project"
        titleClassName="text-3xl font-medium tracking-tight"
        description="Group threads with shared goals and context."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription>{PROJECT_DETAILS_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <ProjectDetailsFields
            name={name}
            onNameChange={setName}
            description={description}
            onDescriptionChange={setDescription}
            goals={goals}
            onGoalsChange={setGoals}
            nameRequired
            namePlaceholder="e.g., Product Launch Q2"
            descriptionPlaceholder="Brief description of what this project is about…"
            goalsPlaceholder="What are the objectives? These will be shown in every thread…"
            showGoalsHint
          />
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button variant="outline" render={<Link to="/threads/new" />}>
            Cancel
          </Button>
          <Button
            disabled={name.trim().length === 0 || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Creating…" : "Create project"}
          </Button>
        </CardFooter>
      </Card>
    </PageLayout>
  )
}
