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
  | "SUPPORT_AGENT_RESPONSE_LINKAGE_MISMATCH"

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
