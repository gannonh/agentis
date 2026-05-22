import { useCallback, useEffect, useState } from "react"
import type { IntegrationToolkit, ToolAccessGrant } from "@workspace/shared"
import {
  getThreadToolGrants,
  grantThreadTool,
  revokeThreadToolGrant,
} from "@/lib/api/client"

export function useThreadToolGrants(threadId: string | undefined) {
  const [grants, setGrants] = useState<ToolAccessGrant[]>([])
  const [availableToolkits, setAvailableToolkits] = useState<IntegrationToolkit[]>(
    []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!threadId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getThreadToolGrants(threadId)
      setGrants(data.grants)
      setAvailableToolkits(data.availableToolkits)
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to load tool grants"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const grantToolkit = useCallback(
    async (toolkitSlug: string, connectionId?: string) => {
      if (!threadId) return
      setError(null)
      try {
        await grantThreadTool(threadId, { toolkitSlug, connectionId })
        await refresh()
      } catch (grantError) {
        const message =
          grantError instanceof Error ? grantError.message : "Failed to grant tool"
        setError(message)
      }
    },
    [threadId, refresh]
  )

  const revokeGrant = useCallback(
    async (grantId: string) => {
      if (!threadId) return
      setError(null)
      try {
        await revokeThreadToolGrant(threadId, grantId)
        await refresh()
      } catch (revokeError) {
        const message =
          revokeError instanceof Error ? revokeError.message : "Failed to revoke tool"
        setError(message)
      }
    },
    [threadId, refresh]
  )

  return {
    grants,
    availableToolkits,
    loading,
    error,
    refresh,
    grantToolkit,
    revokeGrant,
  }
}
