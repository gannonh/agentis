import { Link } from "react-router"
import type { ThreadListItem } from "@workspace/shared"

const DEMO_THREAD_PREFIX = "seed_thread_"
const DEMO_THREAD_LIMIT = 3
const DEMO_THREAD_SUMMARY_FALLBACK = "Open this curated demo thread."

type DemoThreadsSectionProps = {
  threads: ThreadListItem[]
}

export function DemoThreadsSection({ threads }: DemoThreadsSectionProps) {
  const demoThreads = threads
    .filter((thread) => thread.id.startsWith(DEMO_THREAD_PREFIX))
    .slice(0, DEMO_THREAD_LIMIT)

  if (demoThreads.length === 0) {
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
      <ul className="grid gap-2 sm:grid-cols-2">
        {demoThreads.map((thread) => (
          <li key={thread.id}>
            <Link
              to={`/threads/${thread.id}`}
              className="hover:bg-muted/40 flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors"
            >
              <h3 className="text-sm font-medium leading-snug">{thread.title}</h3>
              <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {thread.summary ?? DEMO_THREAD_SUMMARY_FALLBACK}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
