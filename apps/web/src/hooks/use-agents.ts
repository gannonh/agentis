import { useCallback, useEffect, useState } from "react"
import type { AgentListItem } from "@workspace/shared"
import { listAgents } from "@/lib/api/agents-client"

export function useAgents() {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAgents(await listAgents())
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load agents"
      )
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { agents, loading, error, refresh }
}
