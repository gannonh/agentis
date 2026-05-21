import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import type { ThreadListItem } from "@workspace/shared"
import { listThreads } from "@/lib/api/client"

export function RecentThreadsSection() {
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const items = await listThreads()
        setThreads(items.slice(0, 3))
      } catch {
        setThreads([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <section className="flex w-full max-w-3xl flex-col gap-3">
        <h2 className="text-sm font-medium">Recent threads</h2>
        <p className="text-muted-foreground text-xs">Loading…</p>
      </section>
    )
  }

  if (threads.length === 0) {
    return null
  }

  return (
    <section className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Recent threads</h2>
        <Button variant="ghost" size="sm" disabled>
          Show all
        </Button>
      </div>
      <ul className="grid gap-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              to={`/threads/${thread.id}`}
              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm transition-colors"
            >
              <span className="truncate font-medium">{thread.title}</span>
              <span className="text-muted-foreground text-xs capitalize">
                {thread.lastRunStatus ?? thread.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
