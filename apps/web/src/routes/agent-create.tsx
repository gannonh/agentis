import { useState, type FormEvent } from "react"
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
import { useIntegrations } from "@/hooks/use-integrations"
import { createAgent } from "@/lib/api/agents-client"

export function AgentCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [model, setModel] = useState("gpt-4o-mini")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [selectedToolGrantSlugs, setSelectedToolGrantSlugs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toolkits, loading: loadingIntegrations, error: integrationsError } = useIntegrations()
  const connectedToolkits = toolkits.filter((toolkit) => toolkit.status === "connected")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const detail = await createAgent({
        name: name.trim(),
        description: description.trim() || undefined,
        model: model.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        toolGrants: selectedToolGrantSlugs.map((toolkitSlug) => ({ toolkitSlug })),
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
        <form onSubmit={(event) => void handleSubmit(event)}>
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
                Name <span className="text-destructive" aria-hidden>*</span>
              </label>
              <Input
                id="agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Research Agent"
                required
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
                System prompt <span className="text-destructive" aria-hidden>*</span>
              </label>
              <Textarea
                id="agent-system-prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="How should this agent behave?"
                rows={6}
                required
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Tool grants</legend>
              <p className="text-muted-foreground text-xs">
                Grant connected integrations now, or create the agent without tools.
              </p>
              {loadingIntegrations ? (
                <p className="text-muted-foreground text-xs">Loading connected toolkits…</p>
              ) : integrationsError ? (
                <p className="text-muted-foreground text-xs">
                  Tool grants unavailable. You can create this agent and add tools after
                  integrations recover.
                </p>
              ) : connectedToolkits.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No connected toolkits yet. Connect one from{" "}
                  <Link
                    to="/integrations"
                    className="text-foreground underline underline-offset-4"
                  >
                    Integrations
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {connectedToolkits.map((toolkit) => (
                    <label
                      key={toolkit.slug}
                      className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm sm:min-h-8"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={selectedToolGrantSlugs.includes(toolkit.slug)}
                        onChange={(event) => {
                          setSelectedToolGrantSlugs((current) =>
                            event.target.checked
                              ? [...current, toolkit.slug]
                              : current.filter((slug) => slug !== toolkit.slug)
                          )
                        }}
                      />
                      <span className="min-w-0 truncate">{toolkit.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/threads/new" />}
              className="min-h-11 sm:min-h-7"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                name.trim().length === 0 ||
                systemPrompt.trim().length === 0 ||
                submitting
              }
              className="min-h-11 sm:min-h-7"
            >
              {submitting ? "Creating…" : "Create agent"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageLayout>
  )
}
