import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
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
import type {
  AgentDetailInformation,
  AgentDetailResponse,
  IntegrationToolkit,
  UpdateAgentRequest,
} from "@workspace/shared"
import { useIntegrations } from "@/hooks/use-integrations"

type AgentToolGrant = AgentDetailResponse["toolGrants"][number]

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
  return <p className="text-sm text-muted-foreground">{message}</p>
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
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
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
      disabled
      aria-disabled="true"
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      {children}
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        className="size-3"
        strokeWidth={2}
      />
    </button>
  )
}

export function AgentIdentityTab({
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
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </Field>
      </div>

      <section
        className="flex flex-col gap-2"
        aria-labelledby="trust-profile-heading"
      >
        <h2 id="trust-profile-heading" className="text-sm font-medium">
          Trust profile
        </h2>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-4 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <span className="flex min-w-0 items-center gap-3">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="size-5 text-muted-foreground"
              strokeWidth={2}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">Custom</span>
              <span className="block text-xs text-muted-foreground">
                Tune memory access, edit permissions, and learning behavior on
                your own.
              </span>
            </span>
          </span>
          <span className="text-lg text-muted-foreground" aria-hidden>
            ›
          </span>
        </button>
      </section>

      <section
        className="rounded-xl border border-border bg-card/70 p-4"
        aria-labelledby="agent-icon-heading"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="agent-icon-heading" className="text-sm font-medium">
            Icon
          </h2>
          <Badge variant="secondary">Generated</Badge>
        </div>
        {/* TODO: wire generated icon controls to the agent icon generation API. */}
        <div className="grid grid-cols-3 rounded-xl bg-muted p-1 text-center text-xs font-medium">
          <span className="rounded-lg px-3 py-2 text-muted-foreground">
            Emoji
          </span>
          <span className="rounded-lg bg-background px-3 py-2">Generated</span>
          <span className="rounded-lg px-3 py-2 text-muted-foreground">
            URL
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NativeSelectLike>Claymorphism</NativeSelectLike>
          <NativeSelectLike>Default</NativeSelectLike>
          <NativeSelectLike>Fast</NativeSelectLike>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          disabled
        >
          Regenerate icons
        </Button>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="theme-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="theme-heading" className="text-sm font-medium">
            Theme
          </h2>
          <button
            type="button"
            className="text-xs text-muted-foreground"
            disabled
          >
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
          <p className="text-xs font-medium text-[oklch(0.98_0.005_40)]">
            {detail.agent.name}
          </p>
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

export function AgentActivityTab({
  information,
}: {
  information: AgentDetailInformation
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">Search threads</span>
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
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
      {information.recentThreads.length > 0 ? (
        information.recentThreads.map((thread) => (
          <article
            key={thread.id}
            className="rounded-xl border border-border bg-card/70 p-4"
          >
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Database01Icon}
                className="size-4"
                strokeWidth={2}
              />
              {thread.lastRunStatus
                ? `Latest run: ${thread.lastRunStatus}`
                : "Agent test thread"}
            </p>
            <h2 className="mt-2 text-lg font-medium">{thread.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {thread.artifactCount
                ? `${thread.artifactCount} artifact${thread.artifactCount === 1 ? "" : "s"} available from this thread.`
                : "No artifacts captured for this thread yet."}
            </p>
          </article>
        ))
      ) : (
        <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          No activity yet. Start a test thread to see this agent's recent work.
        </p>
      )}
    </div>
  )
}

export function AgentModelTab({
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
      const parsedMaxCost =
        maxCostPerRunUsd.trim() === "" ? null : Number(maxCostPerRunUsd)
      await onSave({
        model,
        maxCostPerRunUsd:
          parsedMaxCost === null || Number.isFinite(parsedMaxCost)
            ? parsedMaxCost
            : null,
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
          <Input
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
        </Field>
        <p className="mt-2 text-xs text-muted-foreground">
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
    description: "Keep this agent ready for ongoing work.",
    status: "Planned for a later milestone",
    action: "Set up",
    icon: ZapIcon,
  },
  {
    title: "Thread",
    description: "Start a test thread from this agent detail page.",
    status: "Available now",
    action: null,
    icon: ChatIcon,
  },
  {
    title: "Slack",
    description: "Let this agent respond from Slack.",
    status: "Planned for a later milestone",
    action: "Connect",
    icon: SlackIcon,
  },
  {
    title: "Telegram",
    description: "Let this agent respond from Telegram.",
    status: "Planned for a later milestone",
    action: "Connect",
    icon: TelegramIcon,
  },
  {
    title: "Scheduled",
    description: "Run this agent on a schedule.",
    status: "Planned for a later milestone",
    action: "Create schedule",
    icon: Calendar03Icon,
  },
  {
    title: "Webhook",
    description: "Trigger this agent from an HTTP request.",
    status: "Planned for a later milestone",
    action: "Create webhook",
    icon: WebhookIcon,
  },
  {
    title: "Email",
    description: "Let this agent respond from email.",
    status: "Planned for a later milestone",
    action: "Create email",
    icon: Mail01Icon,
  },
] as const

export function AgentInvocationsTab() {
  return (
    <div data-testid="agent-invocations-tab" className="flex flex-col gap-2">
      {INVOCATION_OPTIONS.map((option) => (
        <article
          key={option.title}
          aria-label={option.title}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/70 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HugeiconsIcon
                icon={option.icon}
                className="size-4"
                strokeWidth={2}
              />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-medium">
                {option.title}
                <Badge variant="secondary">{option.status}</Badge>
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </div>
          {option.action ? (
            <Button type="button" variant="outline" size="sm" disabled>
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="size-3"
                strokeWidth={2}
              />
              {option.action}
            </Button>
          ) : (
            <TogglePill checked />
          )}
        </article>
      ))}
    </div>
  )
}

export function AgentSkillsTab() {
  return (
    <section
      data-testid="agent-skills-tab"
      className="rounded-xl border border-border bg-card/70 p-4"
      aria-labelledby="skills-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="skills-heading" className="text-sm font-medium">
            Skills
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable instructions this agent can apply while working.
          </p>
        </div>
        <Badge variant="secondary">Planned for a later milestone</Badge>
      </div>
      <div className="mt-4 flex min-h-32 flex-col items-center justify-center gap-4 rounded-xl bg-muted/40 px-4 py-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Skill attachments will let this agent apply reusable workflows when
          that capability is available.
        </p>
        <Button type="button" variant="outline" size="sm" disabled>
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-3"
            strokeWidth={2}
          />
          Add skills
        </Button>
      </div>
    </section>
  )
}

const TOOL_GROUPS = [
  {
    label: "Execution",
    items: [
      [
        "Script",
        "Run Python/JS code in an isolated container.",
        ComputerTerminal01Icon,
      ],
      [
        "Full VM",
        "Persistent virtual machine. Install packages, save files, and run jobs.",
        ServerStack01Icon,
      ],
    ],
  },
  {
    label: "Research",
    items: [
      ["Exa", "Enable Exa.ai semantic search and related tools.", AiSearchIcon],
      [
        "Search",
        "Search the web for information using SDK web search.",
        Search01Icon,
      ],
      [
        "Browser",
        "Control a real browser with AI-powered automation.",
        BrowserIcon,
      ],
      [
        "Find Similar",
        "Find pages semantically similar to a given URL.",
        Link03Icon,
      ],
      [
        "Exa Answer",
        "Get direct answers to questions with source citations.",
        ChatIcon,
      ],
      [
        "Exa Research",
        "Deep multi-source research with structured output.",
        Database01Icon,
      ],
    ],
  },
  {
    label: "Data",
    items: [
      [
        "Tables",
        "Create, update, and query structured data tables.",
        TableIcon,
      ],
      ["Documents", "Create and update persistent documents.", File02Icon],
    ],
  },
  {
    label: "Interactive",
    items: [
      [
        "Webpages & Slides",
        "Generate styled webpages and slide presentations.",
        Globe02Icon,
      ],
      [
        "Slides",
        "Create slide presentations for delivery.",
        Presentation01Icon,
      ],
    ],
  },
  {
    label: "Media",
    items: [
      ["Images", "Generate and edit images.", Image02Icon],
      ["Video", "Generate short video clips with native audio.", Video01Icon],
      ["Audio", "Generate speech or multi-speaker dialogue.", Mic01Icon],
      [
        "Maps",
        "Geocoding, places search, directions, and distance calculations.",
        MapsIcon,
      ],
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
        <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </div>
  )
}

function getToolOptions(
  toolkits: IntegrationToolkit[],
  grants: AgentToolGrant[]
): IntegrationToolkit[] {
  const options = toolkits.reduce<IntegrationToolkit[]>((unique, toolkit) => {
    if (
      toolkit.status === "connected" &&
      !unique.some((option) => option.slug === toolkit.slug)
    ) {
      unique.push(toolkit)
    }
    return unique
  }, [])

  for (const grant of grants) {
    if (options.some((toolkit) => toolkit.slug === grant.toolkitSlug)) continue
    options.push({
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

  return options
}

function toToolGrantInput(
  toolkitSlug: string,
  grant: AgentToolGrant | undefined
) {
  if (grant?.connectionId) {
    return { toolkitSlug, connectionId: grant.connectionId }
  }
  return { toolkitSlug }
}

export function AgentToolsTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const { toolkits } = useIntegrations()
  const grantedBySlug = new Map(
    detail.toolGrants.map((grant) => [grant.toolkitSlug, grant])
  )
  const toolOptions = getToolOptions(toolkits, detail.toolGrants)

  const [selectedToolkits, setSelectedToolkits] = useState(
    new Set(detail.toolGrants.map((grant) => grant.toolkitSlug))
  )
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedToolkits(
      new Set(detail.toolGrants.map((grant) => grant.toolkitSlug))
    )
  }, [detail])

  function setToolkitSelected(toolkitSlug: string, checked: boolean) {
    setSelectedToolkits((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(toolkitSlug)
      } else {
        next.delete(toolkitSlug)
      }
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        toolGrants: toolOptions
          .filter((toolkit) => selectedToolkits.has(toolkit.slug))
          .map((toolkit) =>
            toToolGrantInput(toolkit.slug, grantedBySlug.get(toolkit.slug))
          ),
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
      <section
        className="flex flex-col gap-3"
        aria-labelledby="integrations-heading"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="integrations-heading" className="text-sm font-medium">
              Integrations
            </h2>
            <Badge variant="secondary">{detail.toolGrants.length} active</Badge>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled
            aria-label="Add integration"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={2}
            />
          </Button>
        </div>
        {toolOptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No integrations added yet, connect tools like Airtable or Slack to
            extend this agent's capabilities.
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
                  onChange={(event) =>
                    setToolkitSelected(toolkit.slug, event.target.checked)
                  }
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{toolkit.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {toolkit.description}
                  </span>
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
            <h3 className="text-xs font-medium text-muted-foreground">
              {group.label}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map(([title, description, icon]) => (
                <ToolCard
                  key={title}
                  title={title}
                  description={description}
                  icon={icon}
                />
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
