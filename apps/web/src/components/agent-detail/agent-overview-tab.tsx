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
import type { AgentDetailResponse } from "@workspace/shared"
import { formatRelativeTime } from "@/fixtures"
import type { Thread } from "@/fixtures/schema"

type AgentOverviewThread = Pick<
  Thread,
  "id" | "title" | "status" | "updatedAt"
> & {
  artifactCount?: number
  lastRunStatus?: string
}

type AgentOverviewToolGrant = Pick<
  AgentDetailResponse["toolGrants"][number],
  "id" | "toolkitSlug"
>

type AgentOverviewTabProps = {
  recentThreads: AgentOverviewThread[]
  toolGrants?: AgentOverviewToolGrant[]
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

function UsageChart() {
  const points = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0]
  const max = Math.max(...points)
  const width = 600
  const height = 132
  const step = width / (points.length - 1)
  const path = points
    .map((value, index) => {
      const x = index * step
      const y = height - (max ? value / max : 0) * 92 - 20
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
        const y = height - (max ? value / max : 0) * 92 - 20
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

export function AgentOverviewTab({
  recentThreads,
  toolGrants,
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
              {primaryThread.artifactCount
                ? ` ${primaryThread.artifactCount} artifact${
                    primaryThread.artifactCount === 1 ? "" : "s"
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
            {/* TODO: replace static usage visualization with run cost timeseries from observability APIs. */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Total cost per day</span>
                <span>Total</span>
              </div>
              <UsageChart />
              <dl className="mt-2 flex items-center justify-between border-t border-border pt-4 text-sm">
                <dt className="text-muted-foreground">Total usage</dt>
                <dd className="font-medium">$5.95</dd>
              </dl>
              <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <span>Claude</span>
                  <span>$5.77</span>
                </div>
                <div className="mt-2 grid gap-1 text-muted-foreground">
                  <span>Opus input tokens</span>
                  <span>Opus output tokens</span>
                  <span>Sonnet output tokens</span>
                </div>
              </div>
            </div>
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                aria-label="Evaluation actions"
              >
                ⋮
              </Button>
            </div>
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <HugeiconsIcon
                icon={ChartLineData01Icon}
                className="size-8 text-muted-foreground"
                strokeWidth={2}
              />
              <p className="mt-4 text-sm font-medium">No evaluations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Evaluate agent responses using the eval system.
              </p>
            </div>
          </section>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
