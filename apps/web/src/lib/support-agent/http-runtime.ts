import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"
import {
  SupportAgentRuntimeError,
  type SupportAgentRuntime,
  type SupportAgentRuntimeErrorCode,
} from "./runtime-boundary"

const defaultSupportAgentEndpoint = "/api/support-agent/respond"

type SupportAgentHttpRuntimeOptions = {
  endpoint?: string
  fetch?: typeof globalThis.fetch
}

type SupportAgentErrorPayload = {
  error?: {
    runtimeCode?: SupportAgentRuntimeErrorCode
    message?: string
  }
}

export function createSupportAgentHttpRuntime({
  endpoint = defaultSupportAgentEndpoint,
  fetch = globalThis.fetch,
}: SupportAgentHttpRuntimeOptions = {}): SupportAgentRuntime {
  return {
    async respond(request: SupportAgentChatRequest) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })

      const responseText = await response.text()
      let payload: unknown = {}

      if (responseText) {
        try {
          payload = JSON.parse(responseText)
        } catch {
          if (response.ok) {
            throw new Error(
              "Support agent server returned an invalid response format."
            )
          }
        }
      }

      if (!response.ok) {
        const errorPayload = payload as SupportAgentErrorPayload
        const runtimeCode = errorPayload.error?.runtimeCode
        const message =
          errorPayload.error?.message ?? "Support agent request failed."

        if (runtimeCode) {
          throw new SupportAgentRuntimeError({
            code: runtimeCode,
            message,
          })
        }

        throw new Error(message)
      }

      return payload as SupportAgentChatResponse
    },
  }
}
