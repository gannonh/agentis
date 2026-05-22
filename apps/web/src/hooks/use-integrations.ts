import { useCallback, useEffect, useState } from "react"
import type { IntegrationToolkit } from "@workspace/shared"
import {
  connectIntegration,
  listIntegrations,
  refreshIntegrations,
  resetIntegrationConnection,
} from "@/lib/api/client"

export function useIntegrations() {
  const [toolkits, setToolkits] = useState<IntegrationToolkit[]>([])
  const [composioConfigured, setComposioConfigured] = useState(false)
  const [composioMockEnabled, setComposioMockEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listIntegrations()
      setToolkits(data.toolkits)
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
  }, [])

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
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to refresh integrations"
      setError(message)
    }
  }, [])

  return {
    toolkits,
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
