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
import type { IntegrationToolkit } from "@workspace/shared"
import { AgentSetupFields } from "@/components/agents/agent-setup-fields"
import {
  canSubmitAgentSetup,
  type AgentSetupFormState,
} from "@/components/agents/agent-setup-form"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { useIntegrations } from "@/hooks/use-integrations"
import { createAgent } from "@/lib/api/agents-client"
import { IntegrationMark } from "@/lib/integration-mark"
import { cn } from "@workspace/ui/lib/utils"

const INITIAL_FORM: AgentSetupFormState = {
  name: "",
  description: "",
  model: "gpt-4o-mini",
  systemPrompt: "",
}

const SYSTEM_PROMPT_PLACEHOLDER = [
  "Main job:",
  "How to help:",
  "What to consider:",
  "Apps it can use:",
  "Response style:",
].join("\n")

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
    toolCount === 1 ? "1 action" : `${toolCount} actions`,
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
          ? "border-agent-blue/50 bg-agent-blue/10"
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
            ? "border-agent-blue bg-agent-blue text-white"
            : "border-border bg-background text-muted-foreground"
        )}
        aria-hidden
      >
        {selected ? (
          <HugeiconsIcon icon={Tick01Icon} className="size-3" strokeWidth={2} />
        ) : null}
        {selected ? "Selected" : "Choose"}
      </span>
    </label>
  )
}

export function AgentCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<AgentSetupFormState>(INITIAL_FORM)
  const [selectedToolGrantSlugs, setSelectedToolGrantSlugs] = useState<string[]>([])
  const [webSearchSelected, setWebSearchSelected] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toolkits, loading: loadingIntegrations, error: integrationsError } = useIntegrations()
  const connectedToolkits = toolkits.filter((toolkit) => toolkit.status === "connected")

  const updateForm = (patch: Partial<AgentSetupFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmitAgentSetup(form, submitting)) return

    setSubmitting(true)
    setError(null)
    try {
      const detail = await createAgent({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        model: form.model.trim() || undefined,
        systemPrompt: form.systemPrompt.trim(),
        toolGrants: selectedToolGrantSlugs.map((toolkitSlug) => ({ toolkitSlug })),
        nativeTools: webSearchSelected ? ["webSearch"] : [],
      })
      navigate(`/agents/${encodeURIComponent(detail.agent.id)}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't create this agent. Check the details and try again."
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
        description="Set up a reusable agent by naming it, giving instructions, and choosing connected apps it can use."
      />

      <Card>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">Agent details</CardTitle>
            <CardDescription>
              Tell the agent how to help, what to focus on, and which connected apps it can use.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-4">
            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <AgentSetupFields
              idPrefix="agent"
              value={form}
              onChange={updateForm}
              modelHelp="Default choice for this agent's answers. Change it only when this agent needs a specific capability."
              systemPromptHelp="Tell the agent how to help, what to consider, and how to respond."
              systemPromptPlaceholder={SYSTEM_PROMPT_PLACEHOLDER}
            />

            <fieldset className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <legend className="text-sm font-medium">Connected apps</legend>
                  <p className="text-muted-foreground text-xs">
                    Choose connected apps this agent can use while helping. Access
                    stays limited to the apps you choose.
                  </p>
                </div>
                <Link
                  to="/integrations"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                >
                  Manage connected apps
                  <HugeiconsIcon icon={LinkSquare01Icon} className="size-3" strokeWidth={2} />
                </Link>
              </div>

              {loadingIntegrations ? (
                <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm">
                  Loading connected apps…
                </p>
              ) : integrationsError ? (
                <p className="text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  Connected apps are unavailable. You can create this agent and choose
                  apps later.
                </p>
              ) : connectedToolkits.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                  <p className="text-sm font-medium">No connected apps yet</p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
                    Connect apps, then return here to choose what this agent can use.
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

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium">Built-in capabilities</legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm hover:bg-muted/40">
                <input
                  type="checkbox"
                  aria-label="Search"
                  checked={webSearchSelected}
                  onChange={(event) => setWebSearchSelected(event.target.checked)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">Search</span>
                  <span className="text-xs text-muted-foreground">
                    Find current web information with bounded source evidence.
                  </span>
                </span>
              </label>
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
              disabled={!canSubmitAgentSetup(form, submitting)}
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
