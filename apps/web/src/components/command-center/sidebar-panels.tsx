import type {
  CommandCenterCostBreakdownResponse,
  CommandCenterScoreTrendsResponse,
} from "@workspace/shared"
import { EmptyState } from "@/components/shell/empty-state"
import { ScoreTrendChart } from "@/components/charts/score-trend-chart"
import { buildDailyScoreSeries } from "@/lib/chart-series"

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function hasEnoughScoreTrendData(
  trends: CommandCenterScoreTrendsResponse | null | undefined
): trends is CommandCenterScoreTrendsResponse {
  return (trends?.evaluatedRunCount ?? 0) >= 2
}

function CostByModelList({
  byModel,
  periodDays,
}: {
  byModel: CommandCenterCostBreakdownResponse["byModel"]
  periodDays: number
}) {
  if (byModel.length === 0) {
    return (
      <p className="text-muted-foreground mt-2 text-xs">
        No completed runs in the last {periodDays} days.
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {byModel.map((entry) => (
        <div
          key={entry.model}
          className="rounded-lg bg-muted/40 p-2.5 text-xs"
          data-testid={`cost-model-${entry.model}`}
        >
          <div className="flex items-center justify-between font-medium">
            <span className="truncate pr-2">{entry.model}</span>
            <span className="tabular-nums">{formatUsd(entry.costUsd)}</span>
          </div>
          <p className="text-muted-foreground mt-1">
            {entry.runCount} run{entry.runCount === 1 ? "" : "s"}
          </p>
        </div>
      ))}
    </div>
  )
}

function CostByProviderList({
  byProvider,
}: {
  byProvider: CommandCenterCostBreakdownResponse["byProvider"]
}) {
  if (byProvider.length === 0) {
    return null
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <h3 className="text-xs font-medium">By provider</h3>
      <div className="mt-2 flex flex-col gap-2">
        {byProvider.map((entry) => (
          <div
            key={entry.provider}
            className="flex items-center justify-between text-xs"
            data-testid={`cost-provider-${entry.provider}`}
          >
            <span className="text-muted-foreground">{entry.provider}</span>
            <span className="font-medium tabular-nums">
              {formatUsd(entry.costUsd)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActiveOperationsPanel() {
  return (
    <section
      className="rounded-lg border border-border bg-card"
      aria-labelledby="active-operations-heading"
    >
      <div className="border-b border-border px-4 py-3">
        <h2 id="active-operations-heading" className="text-sm font-medium">
          Active operations
        </h2>
      </div>
      <div className="px-4 py-2">
        <EmptyState
          title="All quiet"
          description="No active operations right now."
          className="border-0 bg-transparent py-6"
        />
      </div>
    </section>
  )
}

type ScoreTrendsPanelProps = {
  trends: CommandCenterScoreTrendsResponse | null
  loading?: boolean
  error?: string | null
}

export function ScoreTrendsPanel({
  trends,
  loading = false,
  error = null,
}: ScoreTrendsPanelProps) {
  const periodDays = trends?.periodDays ?? 90
  const chartPoints = trends
    ? buildDailyScoreSeries(trends.daily, trends.periodDays)
    : []

  return (
    <section
      className="rounded-lg border border-border bg-card px-4 py-3"
      aria-labelledby="score-trends-heading"
    >
      <h2 id="score-trends-heading" className="text-sm font-medium">
        Score trends
      </h2>
      <p className="text-muted-foreground mt-2 text-xs">
        Last {periodDays} days
      </p>
      {loading && !trends ? (
        <p className="text-muted-foreground mt-2 text-xs">Loading trends…</p>
      ) : error ? (
        <p className="text-muted-foreground mt-2 text-xs">{error}</p>
      ) : hasEnoughScoreTrendData(trends) ? (
        <>
          <ScoreTrendChart
            points={chartPoints}
            ariaLabel="Fleet evaluation score trends"
          />
          <p className="text-muted-foreground mt-2 text-xs">
            {trends.evaluatedRunCount} evaluated run
            {trends.evaluatedRunCount === 1 ? "" : "s"} in period
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">
          Not enough eval data for trends yet.
        </p>
      )}
    </section>
  )
}

type CostBreakdownPanelProps = {
  breakdown: CommandCenterCostBreakdownResponse | null
  loading?: boolean
  error?: string | null
}

export function CostBreakdownPanel({
  breakdown,
  loading = false,
  error = null,
}: CostBreakdownPanelProps) {
  const totalCost = breakdown?.totalCostUsd ?? 0
  const periodDays = breakdown?.periodDays ?? 90

  return (
    <section
      className="rounded-lg border border-border bg-card px-4 py-3"
      aria-labelledby="cost-breakdown-heading"
    >
      <h2 id="cost-breakdown-heading" className="text-sm font-medium">
        Cost breakdown
      </h2>
      <p className="mt-2 text-sm font-medium tabular-nums">
        {formatUsd(totalCost)} total
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        Last {periodDays} days
      </p>
      {loading && !breakdown ? (
        <p className="text-muted-foreground mt-2 text-xs">Loading breakdown…</p>
      ) : error ? (
        <p className="text-muted-foreground mt-2 text-xs">{error}</p>
      ) : breakdown && breakdown.totalRuns > 0 ? (
        <>
          <CostByModelList
            byModel={breakdown.byModel}
            periodDays={breakdown.periodDays}
          />
          <CostByProviderList byProvider={breakdown.byProvider} />
        </>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">No cost data yet.</p>
      )}
    </section>
  )
}
