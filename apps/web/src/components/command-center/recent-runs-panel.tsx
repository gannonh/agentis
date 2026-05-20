import { formatRelativeTime } from "@/fixtures"
import type { Run } from "@/fixtures/schema"

type RecentRunsPanelProps = {
  runs: Run[]
}

export function RecentRunsPanel({ runs }: RecentRunsPanelProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="recent-runs-heading">
      <h2 id="recent-runs-heading" className="text-sm font-medium">
        Recent runs
      </h2>
      <div className="rounded-lg border border-border">
        <ul className="divide-y divide-border">
          {runs.map((run) => (
            <li
              key={run.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="font-medium">{run.title}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                ${run.cost.toFixed(2)} · {formatRelativeTime(run.startedAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
