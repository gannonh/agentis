import type { SupportAgentFailureState } from "./runtime-boundary"

export type BrowserSafeSupportAgentApiError = {
  runtimeCode?: string
  title: string
  userMessage: string
  maintainerMessage: string
  message: string
}

export function toBrowserSafeSupportAgentApiError(
  failure: SupportAgentFailureState
): BrowserSafeSupportAgentApiError {
  return {
    runtimeCode: failure.runtimeCode,
    title: failure.title,
    userMessage: failure.userMessage,
    maintainerMessage: failure.maintainerMessage,
    message: failure.userMessage,
  }
}
