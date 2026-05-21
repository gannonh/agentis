import { useCallback, useEffect, useRef, useState } from "react"
import type { Message, Run, ThreadDetail } from "@workspace/shared"
import {
  abortRun,
  getThread,
  sendFollowUp,
  streamRun,
} from "@/lib/api/client"

const ACTIVE_RUN_STATUSES = new Set([
  "queued",
  "running",
  "tool-calling",
])

function getLatestRun(runs: Run[]) {
  return runs[0] ?? null
}

function getMessageText(message: Message) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

export function useThreadSession(threadId: string | undefined) {
  const [detail, setDetail] = useState<ThreadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const streamAbortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!threadId) return null
    const next = await getThread(threadId)
    setDetail(next)
    return next
  }, [threadId])

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = window.setInterval(() => {
      void refresh().catch((pollError) => {
        const message =
          pollError instanceof Error ? pollError.message : "Failed to refresh thread"
        setError(message)
      })
    }, 400)
  }, [refresh, stopPolling])

  const drainStream = useCallback(
    async (runId: string) => {
      streamAbortRef.current?.abort()
      const controller = new AbortController()
      streamAbortRef.current = controller
      setStreaming(true)
      startPolling()

      try {
        const body = await streamRun(runId, controller.signal)
        const reader = body.getReader()
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } catch (streamError) {
        if (!(streamError instanceof DOMException && streamError.name === "AbortError")) {
          const message =
            streamError instanceof Error ? streamError.message : "Stream failed"
          setError(message)
        }
      } finally {
        stopPolling()
        setStreaming(false)
        streamAbortRef.current = null
        if (mountedRef.current) {
          await refresh()
        }
      }
    },
    [refresh, startPolling, stopPolling]
  )

  const startQueuedRunIfNeeded = useCallback(
    async (nextDetail: ThreadDetail) => {
      const latestRun = getLatestRun(nextDetail.runs)
      if (!latestRun || !ACTIVE_RUN_STATUSES.has(latestRun.status)) {
        return
      }
      if (latestRun.status === "queued") {
        await drainStream(latestRun.id)
        return
      }
      startPolling()
    },
    [drainStream, startPolling]
  )

  useEffect(() => {
    if (!threadId) {
      setDetail(null)
      setLoading(false)
      return
    }

    let cancelled = false
    mountedRef.current = true
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const next = await getThread(threadId)
        if (cancelled) return
        setDetail(next)
        await startQueuedRunIfNeeded(next)
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load thread"
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      mountedRef.current = false
      stopPolling()
      streamAbortRef.current?.abort()
    }
  }, [threadId, startQueuedRunIfNeeded, stopPolling])

  const submitFollowUp = useCallback(
    async (prompt: string) => {
      if (!threadId) return
      setError(null)
      const { run } = await sendFollowUp(threadId, { prompt })
      await refresh()
      await drainStream(run.id)
    },
    [threadId, refresh, drainStream]
  )

  const abortActiveRun = useCallback(async () => {
    const latestRun = detail ? getLatestRun(detail.runs) : null
    if (!latestRun) return
    await abortRun(latestRun.id)
    streamAbortRef.current?.abort()
    stopPolling()
    setStreaming(false)
    await refresh()
  }, [detail, refresh, stopPolling])

  const latestRun = detail ? getLatestRun(detail.runs) : null
  const canAbort =
    Boolean(latestRun) &&
    (streaming ||
      latestRun?.status === "running" ||
      latestRun?.status === "tool-calling")

  return {
    detail,
    loading,
    error,
    streaming,
    latestRun,
    steps: detail?.steps ?? [],
    canAbort,
    refresh,
    submitFollowUp,
    abortActiveRun,
    startStream: drainStream,
    getMessageText,
  }
}
