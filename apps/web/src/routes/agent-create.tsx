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
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { createAgent } from "@/lib/api/agents-client"

function parseToolGrantSlugs(value: string) {
  return value
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .map((toolkitSlug) => ({ toolkitSlug }))
}

export function AgentCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [model, setModel] = useState("gpt-4o-mini")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [toolGrants, setToolGrants] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim() || !systemPrompt.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const detail = await createAgent({
        name: name.trim(),
        description: description.trim() || undefined,
        model: model.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        toolGrants: parseToolGrantSlugs(toolGrants),
      })
      navigate(`/agents/${encodeURIComponent(detail.agent.id)}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create agent"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout variant="focused" className="gap-6">
      <PageHeader
        title="New agent"
        titleClassName="text-3xl font-medium tracking-tight"
        description="Create a reusable agent with a prompt, model, and tool grants."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent details</CardTitle>
          <CardDescription>
            Define the identity and runtime defaults for this agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="agent-name">
              Name
            </label>
            <Input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Research Agent"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="agent-description">
              Description
            </label>
            <Textarea
              id="agent-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this agent help with?"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="agent-model">
              Model
            </label>
            <Input
              id="agent-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-4o-mini"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="agent-system-prompt">
              System prompt
            </label>
            <Textarea
              id="agent-system-prompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="How should this agent behave?"
              rows={6}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="agent-tool-grants">
              Tool grants
            </label>
            <Input
              id="agent-tool-grants"
              value={toolGrants}
              onChange={(event) => setToolGrants(event.target.value)}
              placeholder="github, linear"
            />
            <p className="text-muted-foreground text-xs">
              Comma-separated toolkit slugs. Connected toolkits can be granted to
              this agent.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/threads/new" />}
          >
            Cancel
          </Button>
          <Button
            disabled={
              name.trim().length === 0 ||
              systemPrompt.trim().length === 0 ||
              submitting
            }
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Creating…" : "Create agent"}
          </Button>
        </CardFooter>
      </Card>
    </PageLayout>
  )
}
