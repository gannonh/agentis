import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"

export type SupportAgentRuntime = {
  respond(request: SupportAgentChatRequest): Promise<SupportAgentChatResponse>
}

export async function respondWithSupportAgentRuntime(
  runtime: SupportAgentRuntime,
  request: SupportAgentChatRequest
): Promise<SupportAgentChatResponse> {
  return runtime.respond(request)
}
