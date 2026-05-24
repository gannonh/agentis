import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Badge } from "@workspace/ui/components/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AiSearchIcon,
  ArrowDown01Icon,
  BrowserIcon,
  Calendar03Icon,
  ChatIcon,
  CheckmarkCircle02Icon,
  ComputerTerminal01Icon,
  Database01Icon,
  File02Icon,
  Globe02Icon,
  Image02Icon,
  Link03Icon,
  Mail01Icon,
  MapsIcon,
  Mic01Icon,
  PlusSignIcon,
  Presentation01Icon,
  Search01Icon,
  ServerStack01Icon,
  SlackIcon,
  TableIcon,
  TelegramIcon,
  Video01Icon,
  WebhookIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { AgentDetailHero } from "@/components/agent-detail/agent-detail-hero"
import { AgentDetailInspector } from "@/components/agent-detail/agent-detail-inspector"
import { AgentOverviewTab } from "@/components/agent-detail/agent-overview-tab"
import { PageLayout } from "@/components/shell/page-layout"
import { PageHeader } from "@/components/shell/page-header"
import type {
  AgentDetailResponse,
  IntegrationToolkit,
  UpdateAgentRequest,
} from "@workspace/shared"
import { getAgent as getFixtureAgent, getWorkspace } from "@/fixtures"
import type { Agent } from "@/fixtures/schema"
import {
  getAgent as getApiAgent,
  updateAgent as updateApiAgent,
} from "@/lib/api/agents-client"
import { ApiError } from "@/lib/api/client"
import { useIntegrations } from "@/hooks/use-integrations"

function mapApiAgentDetailToAgent(detail: AgentDetailResponse): Agent {
  return {
    id: detail.agent.id,
    name: detail.agent.name,
    description: detail.agent.description?.trim() || "No description yet",
    icon: "search",
    model: detail.agent.model,
    lastUpdatedAt: detail.agent.updatedAt,
    runCount: 0,
    qualityScore: null,
    totalCost: 0,
    tools: detail.toolGrants.map((grant) => grant.toolkitSlug),
    invocations: ["Thread"],
    skillsCount: 0,
    memoriesCount: 0,
    libraryCount: 0,
    integrationsCount: detail.toolGrants.length,
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function StatusText({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="text-muted-foreground text-sm">{message}</p>
}

function getSaveError(error: unknown): string {
  return error instanceof Error ? error.message : "Agent save failed"
}

function TogglePill({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
        checked ? "bg-agent-blue" : "bg-muted"
      }`}
    >
      <span
        className={`size-4 rounded-full bg-foreground transition-transform ${
          checked ? "translate-x-4" : "translate-x-0 bg-muted-foreground"
        }`}
      />
    </span>
  )
}

function SettingRow({
  title,
  description,
  control,
  icon,
}: {
  title: string
  description: string
  control: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function NativeSelectLike({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      {children}
      <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" strokeWidth={2} />
    </button>
  )
}

function AgentIdentityTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const [name, setName] = useState(detail.agent.name)
  const [description, setDescription] = useState(detail.agent.description ?? "")
  const [systemPrompt, setSystemPrompt] = useState(detail.agent.systemPrompt)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(detail.agent.name)
    setDescription(detail.agent.description ?? "")
    setSystemPrompt(detail.agent.systemPrompt)
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        name,
        description: description.trim() ? description : null,
        systemPrompt,
      })
      setStatus("Identity saved")
    } catch (error) {
      setStatus(getSaveError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </Field>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="trust-profile-heading">
        <h2 id="trust-profile-heading" className="text-sm font-medium">
          Trust profile
        </h2>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-4 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span className="flex min-w-0 items-center gap-3">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5 text-muted-foreground" strokeWidth={2} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">Custom</span>
              <span className="text-muted-foreground block text-xs">
                Tune memory access, edit permissions, and learning behavior on your own.
              </span>
            </span>
          </span>
          <span className="text-muted-foreground text-lg" aria-hidden>
            ›
          </span>
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card/70 p-4" aria-labelledby="agent-icon-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="agent-icon-heading" className="text-sm font-medium">
            Icon
          </h2>
          <Badge variant="secondary">Generated</Badge>
        </div>
        {/* TODO: wire generated icon controls to the agent icon generation API. */}
        <div className="grid grid-cols-3 rounded-xl bg-muted p-1 text-center text-xs font-medium">
          <span className="rounded-lg px-3 py-2 text-muted-foreground">Emoji</span>
          <span className="rounded-lg bg-background px-3 py-2">Generated</span>
          <span className="rounded-lg px-3 py-2 text-muted-foreground">URL</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NativeSelectLike>Claymorphism</NativeSelectLike>
          <NativeSelectLike>Default</NativeSelectLike>
          <NativeSelectLike>Fast</NativeSelectLike>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-4 w-full" disabled>
          Regenerate icons
        </Button>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="theme-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="theme-heading" className="text-sm font-medium">
            Theme
          </h2>
          <button type="button" className="text-muted-foreground text-xs" disabled>
            Regenerate
          </button>
        </div>
        {/* TODO: replace this static theme swatch when per-agent theme generation is backed by the API. */}
        <div className="w-full max-w-64 rounded-xl border-2 border-foreground bg-[radial-gradient(circle_at_20%_25%,oklch(0.68_0.18_48),transparent_22%),linear-gradient(135deg,oklch(0.42_0.13_32),oklch(0.23_0.06_18))] p-4 shadow-sm">
          <div className="mb-4 flex gap-1.5" aria-hidden>
            <span className="size-3 rounded-full bg-[oklch(0.64_0.2_27)]" />
            <span className="size-3 rounded-full bg-[oklch(0.68_0.15_55)]" />
            <span className="size-3 rounded-full bg-[oklch(0.7_0.15_73)]" />
          </div>
          <p className="text-xs font-medium text-[oklch(0.98_0.005_40)]">{detail.agent.name}</p>
        </div>
      </section>

      <Field label="System prompt">
        <Textarea
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          rows={10}
          required
          className="font-sans leading-relaxed"
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          Save identity
        </Button>
        <StatusText message={status} />
      </div>
    </form>
  )
}

function AgentActivityTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">Search threads</span>
          <HugeiconsIcon
            icon={Search01Icon}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            strokeWidth={2}
          />
          <input
            type="search"
            aria-label="Search threads"
            placeholder="Search threads..."
            className="h-9 w-full rounded-lg border border-border bg-muted/70 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-medium">
          {[
            ["All", true],
            ["Personal", false],
            ["Shared", false],
          ].map(([label, active]) => (
            <button
              key={label as string}
              type="button"
              className={`rounded-md px-3 py-1.5 ${active ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* TODO: replace this example thread with API-backed agent activity once runs expose thread metadata. */}
      <article className="rounded-xl border border-border bg-card/70 p-4">
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <HugeiconsIcon icon={Database01Icon} className="size-4" strokeWidth={2} />
          Product Launch Q4
        </p>
        <h2 className="mt-2 text-lg font-medium">AI Automation Consulting Lead Strategy</h2>
        <p className="text-muted-foreground mt-2 truncate text-sm">
          Set up and executed the user's first prospecting run for their AI automation consulting practice.
        </p>
      </article>
    </div>
  )
}

function AgentModelTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const [model, setModel] = useState(detail.agent.model)
  const [maxCostPerRunUsd, setMaxCostPerRunUsd] = useState(
    detail.agent.maxCostPerRunUsd?.toString() ?? ""
  )
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setModel(detail.agent.model)
    setMaxCostPerRunUsd(detail.agent.maxCostPerRunUsd?.toString() ?? "")
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        model,
        maxCostPerRunUsd: maxCostPerRunUsd ? Number(maxCostPerRunUsd) : null,
      })
      setStatus("Model saved")
    } catch (error) {
      setStatus(getSaveError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <h2 className="text-sm font-medium">Model & Limits</h2>
      <div className="rounded-xl border border-border bg-card/70 p-3">
        <Field label="Model">
          <Input value={model} onChange={(event) => setModel(event.target.value)} />
        </Field>
        <p className="text-muted-foreground mt-2 text-xs">
          Auto-updates to the latest available model for most users.
        </p>
      </div>
      <SettingRow
        title="Extended thinking"
        description="Adaptive reasoning that auto-adjusts depth. Effort controls quality vs speed."
        control={<TogglePill checked />}
      />
      <SettingRow
        title="Effort level"
        description="Reasoning effort for complex requests."
        control={<NativeSelectLike>Max - Maximum capacity</NativeSelectLike>}
      />
      <SettingRow
        title="Budget limit per query"
        description="Cap the maximum spend per agent query."
        control={
          <Input
            aria-label="Max cost per run USD"
            type="number"
            min="0"
            step="0.01"
            value={maxCostPerRunUsd}
            onChange={(event) => setMaxCostPerRunUsd(event.target.value)}
            placeholder="No limit"
            className="h-8 w-28"
          />
        }
      />
      <SettingRow
        title="Subagent model"
        description="Model used for dispatched subagents. Default is Sonnet."
        control={<NativeSelectLike>Default (Sonnet)</NativeSelectLike>}
      />
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          Save model
        </Button>
        <StatusText message={status} />
      </div>
    </form>
  )
}

const INVOCATION_OPTIONS = [
  {
    title: "Live mode",
    description: "Always-on agent. Context stays in one continuous thread.",
    action: "Set up",
    icon: ZapIcon,
  },
  {
    title: "Thread",
    description: "Interact with this agent in threads",
    enabled: true,
    icon: ChatIcon,
  },
  {
    title: "Slack",
    description: "Use @Agentis in Slack to interact",
    action: "Connect",
    icon: SlackIcon,
  },
  {
    title: "Telegram",
    description: "Respond to messages via Telegram bot",
    action: "Connect",
    icon: TelegramIcon,
  },
  {
    title: "Scheduled",
    description: "Interact with this agent on a schedule",
    action: "Create schedule",
    icon: Calendar03Icon,
  },
  {
    title: "Webhook",
    description: "Trigger this agent via HTTP webhook",
    action: "Create webhook",
    icon: WebhookIcon,
  },
  {
    title: "Email",
    description: "Interact with this agent via email",
    action: "Create email",
    icon: Mail01Icon,
  },
] as const

function AgentInvocationsTab() {
  return (
    <div className="flex flex-col gap-2">
      {/* TODO: wire invocation rows to real invocation channels once the API exposes channel settings. */}
      {INVOCATION_OPTIONS.map((option) => (
        <div
          key={option.title}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/70 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HugeiconsIcon icon={option.icon} className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.title}</span>
              <span className="text-muted-foreground block text-xs">{option.description}</span>
            </span>
          </div>
          {"enabled" in option ? (
            <TogglePill checked />
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              <HugeiconsIcon icon={PlusSignIcon} className="size-3" strokeWidth={2} />
              {option.action}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

const TOOL_GROUPS = [
  {
    label: "Execution",
    items: [
      ["Script", "Run Python/JS code in an isolated container.", ComputerTerminal01Icon],
      ["Full VM", "Persistent virtual machine. Install packages, save files, and run jobs.", ServerStack01Icon],
    ],
  },
  {
    label: "Research",
    items: [
      ["Exa", "Enable Exa.ai semantic search and related tools.", AiSearchIcon],
      ["Search", "Search the web for information using SDK web search.", Search01Icon],
      ["Browser", "Control a real browser with AI-powered automation.", BrowserIcon],
      ["Find Similar", "Find pages semantically similar to a given URL.", Link03Icon],
      ["Exa Answer", "Get direct answers to questions with source citations.", ChatIcon],
      ["Exa Research", "Deep multi-source research with structured output.", Database01Icon],
    ],
  },
  {
    label: "Data",
    items: [
      ["Tables", "Create, update, and query structured data tables.", TableIcon],
      ["Documents", "Create and update persistent documents.", File02Icon],
    ],
  },
  {
    label: "Interactive",
    items: [
      ["Webpages & Slides", "Generate styled webpages and slide presentations.", Globe02Icon],
      ["Slides", "Create slide presentations for delivery.", Presentation01Icon],
    ],
  },
  {
    label: "Media",
    items: [
      ["Images", "Generate and edit images.", Image02Icon],
      ["Video", "Generate short video clips with native audio.", Video01Icon],
      ["Audio", "Generate speech or multi-speaker dialogue.", Mic01Icon],
      ["Maps", "Geocoding, places search, directions, and distance calculations.", MapsIcon],
    ],
  },
] as const

function ToolCard({
  title,
  description,
  icon,
  checked = true,
}: {
  title: string
  description: string
  icon: (typeof TOOL_GROUPS)[number]["items"][number][2]
  checked?: boolean
}) {
  return (
    <div className="flex min-h-16 items-start gap-3 rounded-xl border border-border bg-card/70 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {title}
          {checked ? <span aria-hidden>✓</span> : null}
        </span>
        <span className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
          {description}
        </span>
      </span>
    </div>
  )
}

function AgentToolsTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const { toolkits } = useIntegrations()
  const connectedToolkits = toolkits.filter(
    (toolkit) => toolkit.status === "connected"
  )
  const grantedBySlug = new Map(
    detail.toolGrants.map((grant) => [grant.toolkitSlug, grant])
  )
  const toolOptions = connectedToolkits.reduce<IntegrationToolkit[]>((options, toolkit) => {
    if (!options.some((option) => option.slug === toolkit.slug)) {
      options.push(toolkit)
    }
    return options
  }, [])

  for (const grant of detail.toolGrants) {
    if (!toolOptions.some((toolkit) => toolkit.slug === grant.toolkitSlug)) {
      toolOptions.push({
        slug: grant.toolkitSlug,
        name: grant.toolkitSlug,
        description: "Already granted to this agent.",
        category: "connected",
        featured: false,
        status: "connected",
        connectedAccountCount: grant.connectionId ? 1 : 0,
        availableTools: [],
      })
    }
  }

  const [selectedToolkits, setSelectedToolkits] = useState(
    new Set(detail.toolGrants.map((grant) => grant.toolkitSlug))
  )
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedToolkits(new Set(detail.toolGrants.map((grant) => grant.toolkitSlug)))
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        toolGrants: toolOptions
          .filter((toolkit) => selectedToolkits.has(toolkit.slug))
          .map((toolkit) => {
            const grant = grantedBySlug.get(toolkit.slug)
            return grant?.connectionId
              ? { toolkitSlug: toolkit.slug, connectionId: grant.connectionId }
              : { toolkitSlug: toolkit.slug }
          }),
      })
      setStatus("Tools saved")
    } catch (error) {
      setStatus(getSaveError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-3" aria-labelledby="integrations-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="integrations-heading" className="text-sm font-medium">
              Integrations
            </h2>
            <Badge variant="secondary">{detail.toolGrants.length} active</Badge>
          </div>
          <Button type="button" size="icon" variant="outline" disabled aria-label="Add integration">
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
          </Button>
        </div>
        {toolOptions.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm">
            No integrations added yet, connect tools like Airtable or Slack to extend this agent's capabilities.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {toolOptions.map((toolkit) => (
              <label
                key={toolkit.slug}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card/70 p-3 text-sm hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  aria-label={
                    toolkit.name === toolkit.slug
                      ? toolkit.slug
                      : `${toolkit.name} (${toolkit.slug})`
                  }
                  checked={selectedToolkits.has(toolkit.slug)}
                  onChange={(event) => {
                    const next = new Set(selectedToolkits)
                    if (event.target.checked) {
                      next.add(toolkit.slug)
                    } else {
                      next.delete(toolkit.slug)
                    }
                    setSelectedToolkits(next)
                  }}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{toolkit.name}</span>
                  <span className="text-muted-foreground text-xs">{toolkit.description}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="tools-heading">
        <div className="flex items-center gap-2">
          <h2 id="tools-heading" className="text-sm font-medium">
            Tools
          </h2>
          <Badge variant="secondary">19 active</Badge>
        </div>
        {/* TODO: replace this static tool catalog with the server-backed native tool registry. */}
        {TOOL_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-medium">{group.label}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map(([title, description, icon]) => (
                <ToolCard key={title} title={title} description={description} icon={icon} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          Save tools
        </Button>
        <StatusText message={status} />
      </div>
    </form>
  )
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const fixtureAgent = agentId ? getFixtureAgent(agentId) : undefined
  const shouldLoadApiAgent =
    !!agentId && !fixtureAgent && agentId !== "command-center"
  const [apiAgentDetail, setApiAgentDetail] = useState<AgentDetailResponse | null>(null)
  const [apiAgent, setApiAgent] = useState<Agent | null>(null)
  const [loadingApiAgent, setLoadingApiAgent] = useState(shouldLoadApiAgent)
  const [apiAgentNotFound, setApiAgentNotFound] = useState(false)
  const [apiAgentLoadFailed, setApiAgentLoadFailed] = useState(false)
  const workspace = getWorkspace()

  const loadApiAgent = useCallback(async () => {
    if (!shouldLoadApiAgent) {
      setApiAgentDetail(null)
      setApiAgent(null)
      setApiAgentNotFound(false)
      setApiAgentLoadFailed(false)
      setLoadingApiAgent(false)
      return
    }

    setApiAgentDetail(null)
    setApiAgent(null)
    setApiAgentNotFound(false)
    setApiAgentLoadFailed(false)
    setLoadingApiAgent(true)

    try {
      const detail = await getApiAgent(agentId)
      setApiAgentDetail(detail)
      setApiAgent(mapApiAgentDetailToAgent(detail))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setApiAgentNotFound(true)
      } else {
        setApiAgentLoadFailed(true)
      }
    } finally {
      setLoadingApiAgent(false)
    }
  }, [agentId, shouldLoadApiAgent])

  useEffect(() => {
    void loadApiAgent()
  }, [loadApiAgent])

  const saveApiAgent = useCallback(
    async (payload: UpdateAgentRequest) => {
      if (!agentId) return
      const detail = await updateApiAgent(agentId, payload)
      setApiAgentDetail(detail)
      setApiAgent(mapApiAgentDetailToAgent(detail))
    },
    [agentId]
  )

  const agent = fixtureAgent ?? apiAgent

  if (loadingApiAgent) {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Loading agent"
          description="Loading the agent configuration from the API."
        />
      </PageLayout>
    )
  }

  if (apiAgentLoadFailed) {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Agent unavailable"
          description="The agent API could not load this agent. Try again or return to Command Center."
        />
        <div className="flex gap-2">
          <Button
            type="button"
            nativeButton
            variant="outline"
            size="sm"
            onClick={() => void loadApiAgent()}
          >
            Try again
          </Button>
          <Button
            render={<Link to="/command-center" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            Command Center
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (!agent || agent.id === "command-center" || apiAgentNotFound) {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Agent not found"
          description="Choose an agent from the sidebar or Command Center roster."
        />
        <Button
          render={<Link to="/command-center" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Command Center
        </Button>
      </PageLayout>
    )
  }

  const recentThreads = workspace.threads.filter((t) => t.agentId === agent.id)
  const editable = !!apiAgentDetail

  return (
    <PageLayout className="dark -m-6 min-h-svh bg-background p-6 text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <AgentDetailHero agent={agent} />

          <Tabs defaultValue="overview">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b border-border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="identity" disabled={!editable}>
                Identity
              </TabsTrigger>
              <TabsTrigger value="activity" disabled={!editable}>
                Activity
              </TabsTrigger>
              <TabsTrigger value="model" disabled={!editable}>
                Model
              </TabsTrigger>
              <TabsTrigger value="invocations" disabled={!editable}>
                Invocations
              </TabsTrigger>
              <TabsTrigger value="tools" disabled={!editable}>
                Tools
              </TabsTrigger>
              <TabsTrigger value="skills" disabled>
                Skills
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <AgentOverviewTab recentThreads={recentThreads} />
            </TabsContent>
            {apiAgentDetail ? (
              <>
                <TabsContent value="identity" className="pt-4">
                  <AgentIdentityTab detail={apiAgentDetail} onSave={saveApiAgent} />
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <AgentActivityTab />
                </TabsContent>
                <TabsContent value="model" className="pt-4">
                  <AgentModelTab detail={apiAgentDetail} onSave={saveApiAgent} />
                </TabsContent>
                <TabsContent value="invocations" className="pt-4">
                  <AgentInvocationsTab />
                </TabsContent>
                <TabsContent value="tools" className="pt-4">
                  <AgentToolsTab detail={apiAgentDetail} onSave={saveApiAgent} />
                </TabsContent>
              </>
            ) : null}
          </Tabs>
        </div>

        <AgentDetailInspector agent={agent} />
      </div>
    </PageLayout>
  )
}
