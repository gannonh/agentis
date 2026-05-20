import { useState } from "react"
import { Link } from "react-router"
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

export function ProjectCreatePage() {
  const [name, setName] = useState("")

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <PageHeader
        title="New project"
        description="Group threads with shared goals and context."
      />
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            Goals are injected into every thread&apos;s context.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="project-name" className="text-sm font-medium">
              Project name <span className="text-destructive">*</span>
            </label>
            <Input
              id="project-name"
              placeholder="e.g., Product Launch Q2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="project-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="project-description"
              placeholder="Brief description of what this project is about…"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="project-goals" className="text-sm font-medium">
              Goals
            </label>
            <Textarea
              id="project-goals"
              placeholder="What are the objectives? These will be shown in every thread…"
              rows={4}
            />
            <p className="text-muted-foreground text-xs">
              Goals are injected into every thread&apos;s context, helping the
              agent stay aligned with project objectives.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" render={<Link to="/threads/new" />}>
            Cancel
          </Button>
          <Button disabled={name.trim().length === 0}>Create project</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
