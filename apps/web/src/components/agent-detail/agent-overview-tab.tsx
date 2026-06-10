import { Link } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ChartLineData01Icon,
  DollarCircleIcon,
  Folder01Icon,
  UserIcon,
  Wrench02Icon,
} from "@hugeicons/core-free-icons"
import type {
  AgentConfigurationVersionSummary,
  AgentDetailResponse,
  AgentUsageResponse,
} from "@workspace/shared"
import { formatRelativeTime } from "@/fixtures"
import type { Thread } from "@/fixtures/schema"
import { useAgentUsage } from "@/hooks/use-agent-usage"

type AgentOverviewThread = Pick<
  Thread,
  "id" | "title" | "status" | "updatedAt"
> & {
  documentCount?: number
  lastRunStatus?: string
}

type AgentOverviewToolGrant = Pick<
  AgentDetailResponse["toolGrants"][number],
  "id" | "toolkitSlug"
>

type AgentOverviewTabProps = {
  recentThreads: AgentOverviewThread[]
  toolGrants?: AgentOverviewToolGrant[]
  agentId?: string
  configurationVersions?: AgentConfigurationVersionSummary[]
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function threadStatusBadge(status: AgentOverviewThread["status"]) {
  if (status === "finished") {
    return (
      <Badge
        variant="outline"
        className="border-status-warning-border bg-status-warning-muted text-status-warning-foreground"
      >
        Finished
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="capitalize">
      {status}
    </Badge>
  )
}

function buildDailyCostSeries(usage: AgentUsageResponse): number[] {
  const dailyByDate = new Map(
    usage.daily.map((entry) => [entry.date, entry.costUsd])
  )
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const points: number[] = []

  for (let offset = usage.periodDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(end)
    day.setUTCDate(day.getUTCDate() - offset)
    const dateKey = day.toISOString().slice(0, 10)
    points.push(dailyByDate.get(dateKey) ?? 0)
  }

  return points
}

function UsageCostChart({ points }: { points: number[] }) {
  const max = Math.max(...points, 0)
  const width = 600
  const height = 132
  const step = width / Math.max(points.length - 1, 1)
  const path = points
    .map((value, index) => {
      const x = index * step
      const y = height - (max > 0 ? value / max : 0) * 92 - 20
      return `${index === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full overflow-visible"
      role="img"
      aria-label="Usage cost trend"
    >
      {[20, 48, 76, 104].map((y) => (
        <line
          key={y}
          x1="0"
          x2={width}
          y1={y}
          y2={y}
          className="stroke-border"
          strokeWidth="1"
        />
      ))}
      <path
        d={path}
        fill="none"
        className="stroke-status-success"
        strokeWidth="2"
      />
      {points.map((value, index) => {
        const x = index * step
        const y = height - (max > 0 ? value / max : 0) * 92 - 20
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2.5"
            className="fill-status-success"
          />
        )
      })}
    </svg>
  )
}

function UsageByModelPanel({ usage }: { usage: AgentUsageResponse }) {
  if (usage.byModel.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
        No completed runs in the last {usage.periodDays} days.
      </p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {usage.byModel.map((entry) => (
        <div
          key={entry.model}
          className="rounded-xl bg-muted/40 p-3 text-xs"
          data-testid={`usage-model-${entry.model}`}
        >
          <div className="flex items-center justify-between font-medium">
            <span>{entry.model}</span>
            <span>{formatUsd(entry.costUsd)}</span>
          </div>
          <div className="mt-2 grid gap-1 text-muted-foreground">
            <span>
              {entry.runCount} run{entry.runCount === 1 ? "" : "s"}
            </span>
            {entry.promptTokens != null ? (
              <span>{entry.promptTokens.toLocaleString()} input tokens</span>
            ) : null}
            {entry.completionTokens != null ? (
              <span>
                {entry.completionTokens.toLocaleString()} output tokens
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function AgentUsagePanel({ agentId }: { agentId: string }) {
  const { state, refresh } = useAgentUsage(agentId)

  if (state.status === "loading" || state.status === "idle") {
    return (
      <p
        className="mt-6 text-sm text-muted-foreground"
        data-testid="agent-usage-loading"
      >
        Loading usage for the last 14 days…
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <div
        className="mt-6 rounded-xl border border-border bg-background/60 px-4 py-3"
        data-testid="agent-usage-error"
      >
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refresh()}
        >
          Retry usage load
        </Button>
      </div>
    )
  }

  const { usage } = state
  const chartPoints = buildDailyCostSeries(usage)

  return (
    <div className="mt-6" data-testid="agent-usage-panel">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Total cost per day</span>
        <span>Last {usage.periodDays} days</span>
      </div>
      <UsageCostChart points={chartPoints} />
      <dl className="mt-2 flex items-center justify-between border-t border-border pt-4 text-sm">
        <dt className="text-muted-foreground">Total usage</dt>
        <dd className="font-medium tabular-nums">
          {formatUsd(usage.totalCostUsd)}
        </dd>
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">
        {usage.totalRuns} completed run{usage.totalRuns === 1 ? "" : "s"} in
        this period.
      </p>
      <UsageByModelPanel usage={usage} />
    </div>
  )
}

function FixtureUsageNotice() {
  return (
    <p
      className="mt-6 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground"
      data-testid="agent-usage-fixture-notice"
    >
      Usage observability is available for API-created agents. This preset agent
      uses demo profile data only.
    </p>
  )
}

function EvaluationsEmptyState() {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center text-center"
      data-testid="evaluations-empty-state"
    >
      <HugeiconsIcon
        icon={ChartLineData01Icon}
        className="size-8 text-muted-foreground"
        strokeWidth={2}
      />
      <p className="mt-4 text-sm font-medium">No evaluations yet</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Rubric-based run scoring is not available yet. When rubrics ship, scores
        from completed runs will appear here.
      </p>
      <Button
        render={<Link to="/learning" />}
        nativeButton={false}
        variant="outline"
        size="sm"
        className="mt-4"
      >
        Open Learning
      </Button>
    </div>
  )
}

function VersionHistoryPanel({
  configurationVersions,
}: {
  configurationVersions?: AgentConfigurationVersionSummary[]
}) {
  const versions = [...(configurationVersions ?? [])].sort(
    (left, right) => right.version - left.version
  )

  return (
    <section
      className="rounded-xl border border-border bg-card/70 p-5"
      aria-labelledby="version-history-heading"
      data-testid="version-history-panel"
    >
      <h2
        id="version-history-heading"
        className="flex items-center gap-2 text-base font-medium"
      >
        <HugeiconsIcon
          icon={ChartLineData01Icon}
          className="size-5 text-muted-foreground"
          strokeWidth={2}
        />
        Version history
      </h2>
      {versions.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3">
          {versions.map((version) => (
            <li
              key={version.id}
              className="rounded-xl border border-border bg-background/60 px-4 py-3"
              data-testid={`version-history-item-${version.version}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Version {version.version}</p>
                <Badge variant="secondary">{version.model}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Saved {formatRelativeTime(version.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          No configuration versions recorded yet. Saving agent settings creates a
          new version entry.
        </p>
      )}
    </section>
  )
}

export function AgentOverviewTab({
  recentThreads,
  toolGrants,
  agentId,
  configurationVersions,
}: AgentOverviewTabProps) {
  const primaryThread = recentThreads[0]

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-xl border border-border bg-card/70 p-4"
        aria-labelledby="access-heading"
      >
        <h2
          id="access-heading"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <HugeiconsIcon
            icon={UserIcon}
            className="size-4 text-muted-foreground"
            strokeWidth={2}
          />
          Access
        </h2>
        <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          Only you can run this agent. It has full knowledge access.
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <HugeiconsIcon
              icon={UserIcon}
              className="size-2.5"
              strokeWidth={2}
              aria-hidden
              data-testid="personal-access-icon"
            />
            Personal
          </Badge>
        </div>
      </section>

      {toolGrants ? (
        <section
          className="rounded-xl border border-border bg-card/70 p-4"
          aria-labelledby="configured-tools-heading"
        >
          <h2
            id="configured-tools-heading"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <HugeiconsIcon
              icon={Wrench02Icon}
              className="size-4 text-muted-foreground"
              strokeWidth={2}
            />
            Configured tools
          </h2>
          {toolGrants.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {toolGrants.map((tool) => (
                <Badge key={tool.id} variant="secondary">
                  {tool.toolkitSlug}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              No tools configured yet. Add integrations from the Tools tab.
            </p>
          )}
        </section>
      ) : null}

      <section
        aria-labelledby="recent-threads-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-threads-heading" className="text-sm font-medium">
            Recent threads
          </h2>
          <Button type="button" variant="ghost" size="sm" disabled>
            Show all
          </Button>
        </div>
        {primaryThread ? (
          <article className="rounded-xl border border-border bg-card/70 p-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Folder01Icon}
                className="size-4"
                strokeWidth={2}
              />
              Agent test thread
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium">{primaryThread.title}</h3>
              <div className="flex shrink-0 items-center gap-2">
                {threadStatusBadge(primaryThread.status)}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(primaryThread.updatedAt)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {primaryThread.lastRunStatus
                ? `Latest run: ${primaryThread.lastRunStatus}`
                : "Open this thread to review the latest work trail."}
              {primaryThread.documentCount
                ? ` ${primaryThread.documentCount} document${
                    primaryThread.documentCount === 1 ? "" : "s"
                  } available.`
                : ""}
            </p>
          </article>
        ) : (
          <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
            No threads yet. Start a thread to test this agent with real work.
          </p>
        )}
      </section>

      <Collapsible
        defaultOpen
        className="group/collapsible flex flex-col gap-3"
      >
        <h2 className="text-sm font-medium">
          <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open/collapsible:rotate-180"
              strokeWidth={2}
            />
            Observability
          </CollapsibleTrigger>
        </h2>
        <CollapsibleContent className="flex flex-col gap-6">
          <section
            className="rounded-xl border border-border bg-card/70 p-5"
            aria-labelledby="usage-heading"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="usage-heading"
                className="flex items-center gap-2 text-base font-medium"
              >
                <HugeiconsIcon
                  icon={DollarCircleIcon}
                  className="size-5 text-status-success"
                  strokeWidth={2}
                />
                Usage
              </h2>
              <Button type="button" variant="outline" size="sm" disabled>
                Optimize costs
              </Button>
            </div>
            {agentId ? (
              <AgentUsagePanel agentId={agentId} />
            ) : (
              <FixtureUsageNotice />
            )}
          </section>

          <section
            className="rounded-xl border border-border bg-card/70 p-5"
            aria-labelledby="evaluations-heading"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="evaluations-heading"
                className="flex items-center gap-2 text-base font-medium"
              >
                <HugeiconsIcon
                  icon={ChartLineData01Icon}
                  className="size-5 text-muted-foreground"
                  strokeWidth={2}
                />
                Evaluations
              </h2>
            </div>
            <EvaluationsEmptyState />
          </section>

          <VersionHistoryPanel configurationVersions={configurationVersions} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
