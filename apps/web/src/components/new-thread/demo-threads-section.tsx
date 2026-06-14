import { Link } from "react-router"
import type { ThreadListItem } from "@workspace/shared"
import { ThreadListMetadata } from "@/components/thread/thread-list-metadata"
import { ThreadListStarButton } from "@/components/thread/thread-list-star-button"
import { ThreadSummaryLines } from "@/components/new-thread/thread-summary-lines"

const DEMO_THREAD_SUMMARY_FALLBACK = "Open this curated demo thread."

type DemoThreadsSectionProps = {
  threads: ThreadListItem[]
  onToggleStar?: (threadId: string) => void
  starError?: string | null
}

export function DemoThreadsSection({
  threads,
  onToggleStar,
  starError,
}: DemoThreadsSectionProps) {
  if (threads.length === 0) {
    return null
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Demo threads</h2>
        <p className="text-muted-foreground text-xs">
          Curated examples from the seeded workspace.
        </p>
      </div>
      {starError ? (
        <p className="text-destructive text-xs" role="status">
          {starError}
        </p>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <div className="hover:bg-muted/40 flex h-full items-start gap-2 rounded-xl border border-border bg-card p-4 transition-colors">
              <ThreadListStarButton
                size="card"
                starred={thread.starred ?? false}
                onToggle={() => onToggleStar?.(thread.id)}
                disabled={!onToggleStar}
              />
              <Link
                to={`/threads/${thread.id}`}
                className="flex min-w-0 flex-1 flex-col gap-2 text-left"
              >
                <ThreadSummaryLines
                  title={thread.title}
                  summary={thread.summary}
                  summaryFallback={DEMO_THREAD_SUMMARY_FALLBACK}
                />
                <ThreadListMetadata thread={thread} showStatus={false} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
