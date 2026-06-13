import { Link } from "react-router"
import type { ThreadListItem } from "@workspace/shared"
import { formatRelativeTime } from "@/fixtures"

const RECENT_THREAD_LIMIT = 3
const THREAD_SUMMARY_FALLBACK = "Open this thread to continue the conversation."

type RecentThreadsSectionProps = {
  threads: ThreadListItem[]
  loading?: boolean
}

export function RecentThreadsSection({
  threads,
  loading = false,
}: RecentThreadsSectionProps) {
  const recentThreads = threads.slice(0, RECENT_THREAD_LIMIT)

  if (!loading && recentThreads.length === 0) {
    return null
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-3">
      <h2 className="text-sm font-medium">Recent threads</h2>
      {loading ? (
        <p className="text-muted-foreground text-xs">Loading…</p>
      ) : (
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
                    {(thread.lastRunStatus ?? thread.status).replace(/-/g, " ")}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
