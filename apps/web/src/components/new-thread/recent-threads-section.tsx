import { Link } from "react-router"
import type { ThreadListItem } from "@workspace/shared"
import { formatRelativeTime } from "@/fixtures"

const THREAD_SUMMARY_FALLBACK = "Open this thread to continue the conversation."

type RecentThreadsSectionProps = {
  threads: ThreadListItem[]
  loading?: boolean
}

function formatRunStatus(status: string | undefined): string {
  if (!status) return "Unknown"
  return status.replace(/-/g, " ")
}

export function RecentThreadsSection({
  threads,
  loading = false,
}: RecentThreadsSectionProps) {
  const recentThreads = threads.slice(0, 3)

  if (loading) {
    return (
      <section className="flex w-full max-w-3xl flex-col gap-3">
        <h2 className="text-sm font-medium">Recent threads</h2>
        <p className="text-muted-foreground text-xs">Loading…</p>
      </section>
    )
  }

  if (recentThreads.length === 0) {
    return null
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Recent threads</h2>
      </div>
      <ul className="flex flex-col gap-3">
        {recentThreads.map((thread) => (
          <li key={thread.id}>
            <Link
              to={`/threads/${thread.id}`}
              className="hover:bg-muted/40 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors"
            >
              <div className="flex flex-col gap-1.5 text-left">
                <h3 className="text-sm font-medium leading-snug">{thread.title}</h3>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {thread.summary ?? THREAD_SUMMARY_FALLBACK}
                </p>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                <span>{formatRelativeTime(thread.updatedAt)}</span>
                <span className="capitalize">
                  {formatRunStatus(thread.lastRunStatus ?? thread.status)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { THREAD_SUMMARY_FALLBACK }
