import { useEffect, useMemo, useState } from "react"
import type { ThreadListItem } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { listThreads, updateThread } from "@/lib/api/client"

type AddThreadDialogProps = {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked?: () => void
}

export function AddThreadDialog({
  projectId,
  open,
  onOpenChange,
  onLinked,
}: AddThreadDialogProps) {
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    void listThreads()
      .then((items) => {
        setThreads(items.filter((thread) => !thread.projectId))
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load threads"
        )
        setThreads([])
      })
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return threads
    return threads.filter((thread) => thread.title.toLowerCase().includes(needle))
  }, [query, threads])

  const handleLink = async (threadId: string) => {
    setLinkingId(threadId)
    setError(null)
    try {
      await updateThread(threadId, { projectId })
      onOpenChange(false)
      onLinked?.()
    } catch (linkError) {
      setError(
        linkError instanceof Error ? linkError.message : "Failed to link thread"
      )
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add existing thread</DialogTitle>
          <DialogDescription>
            Link an unassigned thread to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Input
            placeholder="Search threads…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading threads…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No unassigned threads match your search.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {filtered.map((thread) => (
                <li
                  key={thread.id}
                  className="border-border flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{thread.title}</p>
                    {thread.summary ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {thread.summary}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={linkingId !== null}
                    onClick={() => void handleLink(thread.id)}
                  >
                    {linkingId === thread.id ? "Linking…" : "Link"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
