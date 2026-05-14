import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"

export type SupportAgentRuntime = {
  respond(request: SupportAgentChatRequest): Promise<SupportAgentChatResponse>
}

export type SupportAgentRuntimeErrorCode =
  | "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING"
  | "SUPPORT_AGENT_PROVIDER_UNSUPPORTED"
  | "SUPPORT_AGENT_PROVIDER_CALL_FAILED"
  | "SUPPORT_AGENT_PROVIDER_ABORTED"
  | "SUPPORT_AGENT_PROVIDER_OUTPUT_MALFORMED"
  | "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN"
  | "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE"
  | "SUPPORT_AGENT_RESPONSE_LINKAGE_MISMATCH"

export type SupportAgentFailureKind =
  | "provider-configuration-missing"
  | "context-preparation-failed"
  | "model-generation-failed"
  | "provenance-unavailable"

export type SupportAgentFailureState = {
  kind: SupportAgentFailureKind
  runtimeCode?: SupportAgentRuntimeErrorCode
  title: string
  userMessage: string
  maintainerMessage: string
  retryable: boolean
}

export class SupportAgentRuntimeError extends Error {
  readonly code: SupportAgentRuntimeErrorCode

  constructor({
    code,
    message,
  }: {
    code: SupportAgentRuntimeErrorCode
    message: string
  }) {
    super(message)
    this.name = "SupportAgentRuntimeError"
    this.code = code
  }
}

export function toSupportAgentFailureState(
  error: unknown
): SupportAgentFailureState {
  if (error instanceof SupportAgentRuntimeError) {
    switch (error.code) {
      case "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING":
      case "SUPPORT_AGENT_PROVIDER_UNSUPPORTED":
        return {
          kind: "provider-configuration-missing",
          runtimeCode: error.code,
          title: "Provider configuration missing",
          userMessage:
            "The support agent needs provider credentials before it can answer.",
          maintainerMessage:
            "Set the support-agent provider environment variables, then retry the local demo.",
          retryable: false,
        }
      case "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN":
        return {
          kind: "context-preparation-failed",
          runtimeCode: error.code,
          title: "Documentation context unavailable",
          userMessage:
            "The selected documentation could not be prepared for this question.",
          maintainerMessage:
            "Check that each selected source ID and local documentation path is registered for the demo.",
          retryable: false,
        }
      case "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE":
        return {
          kind: "provenance-unavailable",
          runtimeCode: error.code,
          title: "Citation data unavailable",
          userMessage:
            "The support agent answered without citation data, so the answer was not shown.",
          maintainerMessage:
            "Verify the runtime returned provenance for every selected demo source before accepting the answer.",
          retryable: false,
        }
      case "SUPPORT_AGENT_PROVIDER_CALL_FAILED":
      case "SUPPORT_AGENT_PROVIDER_ABORTED":
      case "SUPPORT_AGENT_PROVIDER_OUTPUT_MALFORMED":
      case "SUPPORT_AGENT_RESPONSE_LINKAGE_MISMATCH":
        return {
          kind: "model-generation-failed",
          runtimeCode: error.code,
          title: "Answer generation failed",
          userMessage:
            "The support agent could not generate an answer right now.",
          maintainerMessage:
            "Inspect provider connectivity and retry the same question after the provider recovers.",
          retryable: true,
        }
      default: {
        const exhaustiveCheck: never = error.code

        return {
          kind: "model-generation-failed",
          runtimeCode: exhaustiveCheck,
          title: "Answer generation failed",
          userMessage:
            "The support agent could not generate an answer right now.",
          maintainerMessage:
            "Inspect provider connectivity and retry the same question after the provider recovers.",
          retryable: true,
        }
      }
    }
  }

  return {
    kind: "model-generation-failed",
    title: "Answer generation failed",
    userMessage: "The support agent could not generate an answer right now.",
    maintainerMessage:
      "Inspect the runtime logs for the failed local demo request, then retry after the runtime recovers.",
    retryable: true,
  }
}

export async function respondWithSupportAgentRuntime(
  runtime: SupportAgentRuntime,
  request: SupportAgentChatRequest
): Promise<SupportAgentChatResponse> {
  const response = await runtime.respond(request)

  if (
    response.agentId !== request.agentId ||
    response.conversationId !== request.conversationId ||
    response.inReplyToMessageId !== request.messageId
  ) {
    throw new SupportAgentRuntimeError({
      code: "SUPPORT_AGENT_RESPONSE_LINKAGE_MISMATCH",
      message: "Support agent response did not match the submitted message.",
    })
  }

  return response
}
