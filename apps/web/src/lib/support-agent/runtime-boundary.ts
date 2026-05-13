import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"

export type SupportAgentRuntime = {
  respond(request: SupportAgentChatRequest): Promise<SupportAgentChatResponse>
}

export type SupportAgentRuntimeErrorCode =
  | "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING"
  | "SUPPORT_AGENT_PROVIDER_CALL_FAILED"
  | "SUPPORT_AGENT_PROVIDER_ABORTED"
  | "SUPPORT_AGENT_PROVIDER_OUTPUT_MALFORMED"

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
  return runtime.respond(request)
}
