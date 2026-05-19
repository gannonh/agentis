import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"
import {
  supportKnowledgeRuntimeErrorMessages,
  type SupportKnowledgeRuntimeErrorCode,
} from "./knowledge-contracts"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"

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
  | "SUPPORT_AGENT_HOSTED_ACCESS_DENIED"
  | "SUPPORT_AGENT_HOSTED_BINDING_MISSING"

export type SupportAgentFailureKind =
  | "provider-configuration-missing"
  | "context-preparation-failed"
  | "knowledge-retrieval-failed"
  | "model-generation-failed"
  | "provenance-unavailable"
  | "hosted-access-denied"

export type SupportAgentFailureState = {
  kind: SupportAgentFailureKind
  runtimeCode?: SupportAgentRuntimeErrorCode | SupportKnowledgeRuntimeErrorCode
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

function toKnowledgeRetrievalFailureState(
  code: SupportKnowledgeRuntimeErrorCode
): SupportAgentFailureState {
  return {
    kind: "knowledge-retrieval-failed",
    runtimeCode: code,
    title: "Knowledge retrieval unavailable",
    userMessage: supportKnowledgeRuntimeErrorMessages[code],
    maintainerMessage:
      "Check deployment source registry eligibility, index status, and adapter health before retrying.",
    retryable: code === "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE",
  }
}

function isSupportKnowledgeRuntimeErrorCode(
  code: string
): code is SupportKnowledgeRuntimeErrorCode {
  return code in supportKnowledgeRuntimeErrorMessages
}

export function toSupportAgentFailureState(
  error: unknown
): SupportAgentFailureState {
  if (error instanceof SupportKnowledgeRuntimeError) {
    return toKnowledgeRetrievalFailureState(error.code)
  }

  if (error instanceof SupportAgentRuntimeError) {
    if (isSupportKnowledgeRuntimeErrorCode(error.code)) {
      return toKnowledgeRetrievalFailureState(error.code)
    }
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
      case "SUPPORT_AGENT_HOSTED_ACCESS_DENIED":
        return {
          kind: "hosted-access-denied",
          runtimeCode: error.code,
          title: "Hosted access required",
          userMessage: "Enter the hosted deployment access token and retry.",
          maintainerMessage:
            "Use the current browser access token for this preview, then retry.",
          retryable: false,
        }
      case "SUPPORT_AGENT_HOSTED_BINDING_MISSING":
        return {
          kind: "hosted-access-denied",
          runtimeCode: error.code,
          title: "Hosted deployment incomplete",
          userMessage: "The hosted support agent could not be deployed.",
          maintainerMessage:
            "Set the required server-side support-agent bindings, then rerun the Cloudflare preview deployment command.",
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
