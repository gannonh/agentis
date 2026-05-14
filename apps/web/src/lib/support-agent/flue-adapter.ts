import type { SupportAgentChatRequest } from "./chat-contracts"
import { resolveSupportAgentDocumentationContext } from "./documentation-context"

export type FlueSupportAgentRuntimeInput = {
  agentId: string
  conversationId: string
  userMessage: {
    id: string
    content: string
  }
  knowledgeSourceIds: string[]
  knowledgeSources: Array<{
    id: string
    title: string
    description: string
    contextReference: {
      type: "local-documentation"
      path: string
    }
  }>
  documentationContext: Array<{
    knowledgeSourceId: string
    title: string
    path: string
    content: string
  }>
}

export function toFlueSupportAgentRuntimeInput(
  request: SupportAgentChatRequest
): FlueSupportAgentRuntimeInput {
  const documentationContext = resolveSupportAgentDocumentationContext(request)

  return {
    agentId: request.agentId,
    conversationId: request.conversationId,
    userMessage: {
      id: request.messageId,
      content: request.question,
    },
    knowledgeSourceIds: [...request.knowledgeSourceIds],
    knowledgeSources: request.knowledgeSources.map((source) => ({
      id: source.id,
      title: source.title,
      description: source.description,
      contextReference: { ...source.contextReference },
    })),
    documentationContext: documentationContext.map((context) => ({
      knowledgeSourceId: context.knowledgeSourceId,
      title: context.title,
      path: context.path,
      content: context.content,
    })),
  }
}
