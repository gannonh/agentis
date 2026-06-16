import { useCallback, useEffect, useRef, useState } from "react"
import {
  agentWebhookSchema,
  type AgentWebhook,
  type CreateAgentWebhookRequest,
  type CreateAgentWebhookResponse,
  type RotateAgentWebhookSecretResponse,
  type UpdateAgentWebhookRequest,
} from "@workspace/shared"
import {
  createAgentWebhook,
  deleteAgentWebhook,
  listAgentWebhooks,
  rotateAgentWebhookSecret,
  updateAgentWebhook,
} from "@/lib/api/agents-client"

function webhookErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useAgentWebhooks(agentId: string) {
  const [webhooks, setWebhooks] = useState<AgentWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latestRefreshRequest = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++latestRefreshRequest.current
    setLoading(true)
    setError(null)
    try {
      const data = await listAgentWebhooks(agentId)
      if (requestId !== latestRefreshRequest.current) return
      setWebhooks(data)
    } catch (loadError) {
      if (requestId !== latestRefreshRequest.current) return
      setError(webhookErrorMessage(loadError, "Failed to load webhooks"))
    } finally {
      if (requestId === latestRefreshRequest.current) {
        setLoading(false)
      }
    }
  }, [agentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createWebhook(body: CreateAgentWebhookRequest) {
    const created = await createAgentWebhook(agentId, body)
    const webhook = agentWebhookSchema.parse(created)
    setWebhooks((current) => [webhook, ...current])
    return created
  }

  async function saveWebhook(
    webhookId: string,
    body: UpdateAgentWebhookRequest
  ) {
    const updated = await updateAgentWebhook(agentId, webhookId, body)
    setWebhooks((current) =>
      current.map((webhook) =>
        webhook.id === webhookId ? updated : webhook
      )
    )
    return updated
  }

  async function removeWebhook(webhookId: string) {
    await deleteAgentWebhook(agentId, webhookId)
    setWebhooks((current) =>
      current.filter((webhook) => webhook.id !== webhookId)
    )
  }

  async function rotateSecret(webhookId: string) {
    const rotated = await rotateAgentWebhookSecret(agentId, webhookId)
    setWebhooks((current) =>
      current.map((webhook) =>
        webhook.id === webhookId ? rotated.webhook : webhook
      )
    )
    return rotated
  }

  return {
    webhooks,
    loading,
    error,
    refresh,
    createWebhook,
    saveWebhook,
    removeWebhook,
    rotateSecret,
  }
}

export type {
  AgentWebhook,
  CreateAgentWebhookResponse,
  RotateAgentWebhookSecretResponse,
}
