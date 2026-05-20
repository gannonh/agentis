import type { Workspace } from "@/fixtures/schema"
import { cn } from "@workspace/ui/lib/utils"

type FleetStatsProps = {
  metrics: Workspace["commandCenter"]
}

export function FleetStats({ metrics }: FleetStatsProps) {
  const items: { label: string; value: string | number; highlight?: boolean }[] = [
    { label: "Agents", value: metrics.agents },
    { label: "Active", value: metrics.active, highlight: metrics.active > 0 },
    { label: "Total runs", value: metrics.totalRuns },
    {
      label: "Avg score",
      value: metrics.avgScore != null ? `${metrics.avgScore}%` : "—",
      highlight: metrics.avgScore != null && metrics.avgScore >= 80,
    },
    { label: "Total cost", value: `$${metrics.totalCost.toFixed(2)}` },
    {
      label: "Pending",
      value: metrics.pending,
      highlight: metrics.pending > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3"
        >
          <span className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
            {item.label}
          </span>
          <span
            className={cn(
              "text-lg font-medium tabular-nums",
              item.highlight &&
                item.label === "Pending" &&
                "text-amber-600 dark:text-amber-500",
              item.highlight &&
                (item.label === "Active" || item.label === "Avg score") &&
                "text-emerald-600 dark:text-emerald-500"
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
