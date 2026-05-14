import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"
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

export type FlueSupportAgentRuntimeResponse = {
  assistantMessage: {
    id: string
    inReplyToMessageId?: string
    content: string
  }
  provenance?: Array<{
    sourceId: string
    knowledgeSourceId: string
    title: string
    excerpt: string
    [runtimeField: string]: unknown
  }>
  [runtimeField: string]: unknown
}

export function toFlueSupportAgentRuntimeInput(
  request: SupportAgentChatRequest
): FlueSupportAgentRuntimeInput {
  const documentationContext = resolveSupportAgentDocumentationContext(request)
  const knowledgeSourceIds = documentationContext.map(
    (context) => context.knowledgeSourceId
  )
  const knowledgeSourcesById = new Map(
    request.knowledgeSources.map((source) => [source.id, source])
  )

  return {
    agentId: request.agentId,
    conversationId: request.conversationId,
    userMessage: {
      id: request.messageId,
      content: request.question,
    },
    knowledgeSourceIds,
    knowledgeSources: knowledgeSourceIds.map((knowledgeSourceId) => {
      const source = knowledgeSourcesById.get(knowledgeSourceId)!

      return {
        id: source.id,
        title: source.title,
        description: source.description,
        contextReference: { ...source.contextReference },
      }
    }),
    documentationContext: documentationContext.map((context) => ({
      knowledgeSourceId: context.knowledgeSourceId,
      title: context.title,
      path: context.path,
      content: context.content,
    })),
  }
}

export function toSupportAgentChatResponse(
  request: SupportAgentChatRequest,
  response: FlueSupportAgentRuntimeResponse
): SupportAgentChatResponse {
  return {
    agentId: request.agentId,
    conversationId: request.conversationId,
    messageId: response.assistantMessage.id,
    inReplyToMessageId:
      response.assistantMessage.inReplyToMessageId ?? request.messageId,
    answer: response.assistantMessage.content,
    sources: response.provenance?.map((source) => ({
      id: source.sourceId,
      knowledgeSourceId: source.knowledgeSourceId,
      title: source.title,
      excerpt: source.excerpt,
    })) ?? [],
  }
}
