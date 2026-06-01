import { useMemo, useState } from "react"
import { Link } from "react-router"
import type { ThreadListItem } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  GridViewIcon,
  LeftToRightListDashIcon,
  Message01Icon,
  Search01Icon,
  SortingAZ02Icon,
  ThreeDViewIcon,
} from "@hugeicons/core-free-icons"
import { formatRelativeTime } from "@/fixtures"
import { cn } from "@workspace/ui/lib/utils"

type SortKey = "recent" | "title"

type ProjectThreadsPanelProps = {
  threads: ThreadListItem[]
}

export function ProjectThreadsPanel({ threads }: ProjectThreadsPanelProps) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("recent")
  const [view, setView] = useState<"list" | "grid">("list")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let items = threads
    if (needle) {
      items = items.filter(
        (thread) =>
          thread.title.toLowerCase().includes(needle) ||
          thread.summary?.toLowerCase().includes(needle)
      )
    }
    return [...items].sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title)
      }
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    })
  }, [query, sort, threads])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium">Threads ({threads.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:flex-none">
            <HugeiconsIcon
              icon={Search01Icon}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              strokeWidth={2}
            />
            <Input
              className="h-8 pl-8"
              placeholder="Search threads…"
              aria-label="Search threads"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center rounded-md border border-border p-0.5">
            <Button
              type="button"
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Grid view"
              onClick={() => setView("grid")}
            >
              <HugeiconsIcon icon={GridViewIcon} className="size-3.5" strokeWidth={2} />
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <HugeiconsIcon
                icon={LeftToRightListDashIcon}
                className="size-3.5"
                strokeWidth={2}
              />
            </Button>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={SortingAZ02Icon} className="size-3.5" strokeWidth={2} />
            <select
              aria-label="Sort threads"
              className="border-input bg-background h-8 rounded-md border px-2 text-sm text-foreground"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="recent">Most Recent</option>
              <option value="title">Title</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm">
          No threads in this project yet. Start a new thread to begin.
        </p>
      ) : (
        <ul
          className={cn(
            "gap-3",
            view === "grid"
              ? "grid sm:grid-cols-2"
              : "flex flex-col"
          )}
        >
          {filtered.map((thread) => (
            <li key={thread.id}>
              <Link
                to={`/threads/${thread.id}`}
                className="hover:bg-muted/40 flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors"
              >
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-medium leading-snug">{thread.title}</h3>
                  <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                    {thread.summary ??
                      "Open this thread to continue the conversation."}
                  </p>
                </div>
                <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-3 text-xs">
                  <span>{formatRelativeTime(thread.updatedAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon
                      icon={Message01Icon}
                      className="size-3.5"
                      strokeWidth={2}
                    />
                    {thread.messageCount ?? 0} msgs
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon
                      icon={ThreeDViewIcon}
                      className="size-3.5"
                      strokeWidth={2}
                    />
                    {thread.documentCount ?? 0} documents
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
