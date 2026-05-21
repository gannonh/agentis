import { useCallback, useEffect, useState } from "react"
import type { RuntimeHealth } from "@workspace/shared"
import { fetchRuntimeHealth } from "./client.js"

export function useRuntimeHealth() {
  const [health, setHealth] = useState<RuntimeHealth>({ available: false })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const next = await fetchRuntimeHealth()
    setHealth(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      const next = await fetchRuntimeHealth()
      if (!cancelled) {
        setHealth(next)
        setLoading(false)
      }
    }

    void poll()
    const interval = window.setInterval(() => {
      void poll()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return { health, loading, refresh }
}
