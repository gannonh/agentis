import { useCallback, useEffect, useRef, useState } from "react"
import type { IntegrationToolkit } from "@workspace/shared"
import {
  connectIntegration,
  listIntegrations,
  refreshIntegrations,
  resetIntegrationConnection,
} from "@/lib/api/client"

const SEARCH_DEBOUNCE_MS = 300

function integrationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useIntegrations() {
  const [toolkits, setToolkits] = useState<IntegrationToolkit[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [composioConfigured, setComposioConfigured] = useState(false)
  const [composioMockEnabled, setComposioMockEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const latestRefreshId = useRef(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [query])

  const refresh = useCallback(
    async (searchQuery = debouncedQuery, selectedCategory = category) => {
      const refreshId = latestRefreshId.current + 1
      latestRefreshId.current = refreshId
      setLoading(true)
      setError(null)
      try {
        const data = await listIntegrations({
          q: searchQuery || undefined,
          category: selectedCategory || undefined,
        })
        if (refreshId !== latestRefreshId.current) return
        setToolkits(data.toolkits)
        setCategories(data.categories)
        setComposioConfigured(data.composioConfigured)
        setComposioMockEnabled(data.composioMockEnabled)
      } catch (refreshError) {
        if (refreshId !== latestRefreshId.current) return
        setError(integrationErrorMessage(refreshError, "Failed to load integrations"))
      } finally {
        if (refreshId === latestRefreshId.current) {
          setLoading(false)
        }
      }
    },
    [category, debouncedQuery]
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = useCallback(
    async (toolkitSlug: string) => {
      setError(null)
      try {
        const result = await connectIntegration(toolkitSlug)
        if (result.redirectUrl.startsWith("http")) {
          window.location.href = result.redirectUrl
          return
        }
        await refresh()
      } catch (connectError) {
        setError(integrationErrorMessage(connectError, "Failed to start connection"))
      }
    },
    [refresh]
  )

  const resetConnection = useCallback(
    async (toolkitSlug: string) => {
      setError(null)
      try {
        await resetIntegrationConnection(toolkitSlug)
        await refresh()
        setNotice("Connection reset. You can connect again.")
      } catch (resetError) {
        setError(integrationErrorMessage(resetError, "Failed to reset connection"))
      }
    },
    [refresh]
  )

  const refreshStatuses = useCallback(async () => {
    setError(null)
    try {
      const data = await refreshIntegrations({
        q: debouncedQuery || undefined,
        category: category || undefined,
      })
      setToolkits(data.toolkits)
      setCategories(data.categories)
      setComposioConfigured(data.composioConfigured)
      setComposioMockEnabled(data.composioMockEnabled)
      setNotice("Connection statuses refreshed.")
    } catch (refreshError) {
      setError(integrationErrorMessage(refreshError, "Failed to refresh integrations"))
    }
  }, [category, debouncedQuery])

  return {
    toolkits,
    categories,
    query,
    category,
    setQuery,
    setCategory,
    composioConfigured,
    composioMockEnabled,
    loading,
    error,
    notice,
    setNotice,
    refresh,
    connect,
    refreshStatuses,
    resetConnection,
  }
}
