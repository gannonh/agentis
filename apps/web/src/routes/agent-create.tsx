import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
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
import type { IntegrationToolkit } from "@workspace/shared"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { useIntegrations } from "@/hooks/use-integrations"
import { createAgent } from "@/lib/api/agents-client"
import { IntegrationMark } from "@/lib/integration-mark"
import { cn } from "@workspace/ui/lib/utils"

function formatCategory(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toolkitDetail(toolkit: IntegrationToolkit) {
  const toolCount = toolkit.availableTools.length
  const accountCount = toolkit.connectedAccountCount
  return [
    formatCategory(toolkit.category),
    toolCount === 1 ? "1 tool" : `${toolCount} tools`,
    accountCount === 1 ? "1 account" : `${accountCount} accounts`,
  ].join(" · ")
}

type ToolGrantOptionProps = {
  toolkit: IntegrationToolkit
  selected: boolean
  onSelectedChange: (selected: boolean) => void
}

function ToolGrantOption({
  toolkit,
  selected,
  onSelectedChange,
}: ToolGrantOptionProps) {
  return (
    <label
      className={cn(
        "group relative flex min-h-24 cursor-pointer gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40",
        selected
          ? "border-status-success-border bg-status-success-muted/40"
          : "border-border"
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={selected}
        onChange={(event) => onSelectedChange(event.target.checked)}
      />
      <IntegrationMark integrationId={toolkit.slug} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 pr-6">
        <span className="text-sm font-medium">{toolkit.name}</span>
        <span className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
          {toolkit.description}
        </span>
        <span className="text-muted-foreground mt-auto text-xs">
          {toolkitDetail(toolkit)}
        </span>
      </span>
      <span
        className={cn(
          "absolute top-3 right-3 inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[0.625rem] font-medium transition-colors",
          selected
            ? "border-status-success-border bg-status-success text-white"
            : "border-border bg-background text-muted-foreground"
        )}
        aria-hidden
      >
        {selected ? (
          <HugeiconsIcon icon={Tick01Icon} className="size-3" strokeWidth={2} />
        ) : null}
        {selected ? "Granted" : "Grant"}
      </span>
    </label>
  )
}

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
        description="Create a reusable agent with a prompt, model, and scoped tool access."
      />

      <Card>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">Agent details</CardTitle>
            <CardDescription>
              Define the identity, behavior, and tools this agent can use.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-4">
            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
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

              <div className="flex flex-col gap-2 sm:col-span-2">
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

            <fieldset className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <legend className="text-sm font-medium">Tool grants</legend>
                  <p className="text-muted-foreground text-xs">
                    Select connected integrations this agent can use during runs.
                  </p>
                </div>
                <Link
                  to="/integrations"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                >
                  Manage integrations
                  <HugeiconsIcon icon={LinkSquare01Icon} className="size-3" strokeWidth={2} />
                </Link>
              </div>

              {loadingIntegrations ? (
                <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm">
                  Loading connected toolkits…
                </p>
              ) : integrationsError ? (
                <p className="text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  Tool grants unavailable. You can create this agent and add tools after
                  integrations recover.
                </p>
              ) : connectedToolkits.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                  <p className="text-sm font-medium">No connected toolkits yet</p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
                    Connect services from Integrations, then return here to grant
                    agent-level access.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {connectedToolkits.map((toolkit) => (
                    <ToolGrantOption
                      key={toolkit.slug}
                      toolkit={toolkit}
                      selected={selectedToolGrantSlugs.includes(toolkit.slug)}
                      onSelectedChange={(selected) => {
                        setSelectedToolGrantSlugs((current) =>
                          selected
                            ? [...current, toolkit.slug]
                            : current.filter((slug) => slug !== toolkit.slug)
                        )
                      }}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          </CardContent>
          <CardFooter className="mt-2 flex justify-between gap-3 border-t border-border pt-4">
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
