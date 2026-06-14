import { useCallback, useState, type Dispatch, type SetStateAction } from "react"
import type { ThreadListItem } from "@workspace/shared"
import { updateThread } from "@/lib/api/client"

export function useThreadStarToggle(
  setThreads: Dispatch<SetStateAction<ThreadListItem[]>>
) {
  const [starError, setStarError] = useState<string | null>(null)

  const toggleStar = useCallback(
    async (threadId: string) => {
      let nextStarred: boolean | undefined

      setThreads((current) => {
        const thread = current.find((item) => item.id === threadId)
        if (!thread) return current

        nextStarred = !(thread.starred ?? false)
        return current.map((item) =>
          item.id === threadId ? { ...item, starred: nextStarred! } : item
        )
      })

      if (nextStarred === undefined) return

      try {
        await updateThread(threadId, { starred: nextStarred })
        setStarError(null)
      } catch {
        setThreads((current) =>
          current.map((item) =>
            item.id === threadId ? { ...item, starred: !nextStarred! } : item
          )
        )
        setStarError("Could not update star. Try again.")
      }
    },
    [setThreads]
  )

  return { toggleStar, starError }
}
