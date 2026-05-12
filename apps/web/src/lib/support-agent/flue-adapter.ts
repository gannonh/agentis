import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"

export type SupportAgentRuntime = {
  respond(request: SupportAgentChatRequest): Promise<SupportAgentChatResponse>
}

export type FlueSupportAgentRuntimeInput = {
  agentId: string
  conversationId: string
  userMessage: {
    id: string
    content: string
  }
  knowledgeSourceIds: string[]
}

export function toFlueSupportAgentRuntimeInput(
  request: SupportAgentChatRequest
): FlueSupportAgentRuntimeInput {
  return {
    agentId: request.agentId,
    conversationId: request.conversationId,
    userMessage: {
      id: request.messageId,
      content: request.question,
    },
    knowledgeSourceIds: [...request.knowledgeSourceIds],
  }
}
