import { Link } from "react-router"
import { EmptyState } from "@/components/shell/empty-state"
import { formatRelativeTime } from "@/fixtures"
import type { CommandCenterRecentRun } from "@workspace/shared"

type RecentRunsPanelProps = {
  runs: CommandCenterRecentRun[]
  loading?: boolean
}

export function RecentRunsPanel({ runs, loading = false }: RecentRunsPanelProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="recent-runs-heading">
      <h2 id="recent-runs-heading" className="text-sm font-medium">
        Recent runs
      </h2>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading recent runs…</p>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No runs yet"
          description="Completed thread runs will appear here with cost and links to the thread."
        />
      ) : (
        <div className="rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  to={`/threads/${run.threadId}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">{run.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    ${run.costUsd.toFixed(2)} · {formatRelativeTime(run.startedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
