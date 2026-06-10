import { cn } from "@workspace/ui/lib/utils"

export type FleetMetrics = {
  agents: number
  active: number
  totalRuns: number
  avgScore: number | null
  totalCost: number
  pending: number
}

type FleetStatsProps = {
  metrics: FleetMetrics
}

type StatItem = {
  label: string
  value: string | number
  highlight?: "success" | "warning"
}

export function FleetStats({ metrics }: FleetStatsProps) {
  const items: StatItem[] = [
    { label: "Agents", value: metrics.agents },
    { label: "Active runs", value: metrics.active, highlight: metrics.active > 0 ? "success" : undefined },
    { label: "Total runs", value: metrics.totalRuns },
    {
      label: "Avg score",
      value: metrics.avgScore != null ? `${metrics.avgScore}%` : "—",
      highlight:
        metrics.avgScore != null && metrics.avgScore >= 80 ? "success" : undefined,
    },
    { label: "Total cost", value: `$${metrics.totalCost.toFixed(2)}` },
    {
      label: "Pending",
      value: metrics.pending,
      highlight: metrics.pending > 0 ? "warning" : undefined,
    },
  ]

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-6 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <dt className="text-muted-foreground text-xs font-medium">{item.label}</dt>
          <dd
            className={cn(
              "font-medium tabular-nums",
              item.highlight === "warning" && "text-status-warning-foreground",
              item.highlight === "success" && "text-status-success-foreground"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
