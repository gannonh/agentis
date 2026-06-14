import { Link } from "react-router"
import type { ThreadListItem } from "@workspace/shared"
import { ThreadListMetadata } from "@/components/thread/thread-list-metadata"
import {
  ThreadListStarButton,
  ThreadStarErrorNotice,
} from "@/components/thread/thread-list-star-button"
import { formatRelativeTime } from "@/fixtures"

const THREAD_SUMMARY_FALLBACK = "Open this thread to continue the conversation."

type RecentThreadsSectionProps = {
  threads: ThreadListItem[]
  loading?: boolean
  onToggleStar?: (threadId: string) => void
  starError?: string | null
}

export function RecentThreadsSection({
  threads,
  loading = false,
  onToggleStar,
  starError,
}: RecentThreadsSectionProps) {
  if (!loading && threads.length === 0) {
    return null
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-3">
      <h2 className="text-sm font-medium">Recent threads</h2>
      <ThreadStarErrorNotice message={starError} />
      {loading ? (
        <p className="text-muted-foreground text-xs">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((thread) => (
            <li key={thread.id}>
              <div className="hover:bg-muted/40 flex items-start gap-2 rounded-xl border border-border bg-card p-4 transition-colors">
                <ThreadListStarButton
                  size="card"
                  starred={thread.starred ?? false}
                  onToggle={() => onToggleStar?.(thread.id)}
                  disabled={!onToggleStar}
                />
                <Link
                  to={`/threads/${thread.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-3 text-left"
                >
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-medium leading-snug">
                      {thread.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                      {thread.summary ?? THREAD_SUMMARY_FALLBACK}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(thread.updatedAt)}
                    </span>
                    <ThreadListMetadata thread={thread} />
                  </div>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
