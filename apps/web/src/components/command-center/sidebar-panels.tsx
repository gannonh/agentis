import { EmptyState } from "@/components/shell/empty-state"

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

export function ScoreTrendsPanel() {
  return (
    <section
      className="rounded-lg border border-border bg-card px-4 py-3"
      aria-labelledby="score-trends-heading"
    >
      <h2 id="score-trends-heading" className="text-sm font-medium">
        Score trends
      </h2>
      <p className="text-muted-foreground mt-2 text-xs">Last 90 days</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Not enough eval data for trends yet.
      </p>
    </section>
  )
}

export function CostBreakdownPanel({ totalCost }: { totalCost: number }) {
  return (
    <section
      className="rounded-lg border border-border bg-card px-4 py-3"
      aria-labelledby="cost-breakdown-heading"
    >
      <h2 id="cost-breakdown-heading" className="text-sm font-medium">
        Cost breakdown
      </h2>
      <p className="mt-2 text-sm font-medium tabular-nums">${totalCost.toFixed(2)} total</p>
      <p className="text-muted-foreground mt-1 text-xs">No cost data yet.</p>
    </section>
  )
}
