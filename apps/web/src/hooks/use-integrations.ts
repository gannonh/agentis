import { useCallback, useEffect, useState } from "react"
import type { IntegrationToolkit } from "@workspace/shared"
import {
  connectIntegration,
  listIntegrations,
  refreshIntegrations,
  resetIntegrationConnection,
} from "@/lib/api/client"

const SEARCH_DEBOUNCE_MS = 300

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [query])

  const refresh = useCallback(
    async (searchQuery = debouncedQuery, selectedCategory = category) => {
      setLoading(true)
      setError(null)
      try {
        const data = await listIntegrations({
          q: searchQuery || undefined,
          category: selectedCategory || undefined,
        })
        setToolkits(data.toolkits)
        setCategories(data.categories)
        setComposioConfigured(data.composioConfigured)
        setComposioMockEnabled(data.composioMockEnabled)
      } catch (refreshError) {
        const message =
          refreshError instanceof Error
            ? refreshError.message
            : "Failed to load integrations"
        setError(message)
      } finally {
        setLoading(false)
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
        const message =
          connectError instanceof Error
            ? connectError.message
            : "Failed to start connection"
        setError(message)
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
        const message =
          resetError instanceof Error
            ? resetError.message
            : "Failed to reset connection"
        setError(message)
      }
    },
    [refresh]
  )

  const refreshStatuses = useCallback(async () => {
    setError(null)
    try {
      const data = await refreshIntegrations()
      setToolkits(data.toolkits)
      setNotice("Connection statuses refreshed.")
      await refresh()
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to refresh integrations"
      setError(message)
    }
  }, [refresh])

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
