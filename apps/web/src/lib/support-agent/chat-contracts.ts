export type SupportAgentKnowledgeSourceSelection = {
  id: string
  title: string
  description: string
  contextReference: {
    type: "local-documentation"
    path: string
  }
}

export type SupportAgentChatRequest = {
  agentId: string
  conversationId: string
  messageId: string
  question: string
  knowledgeSourceIds: string[]
  knowledgeSources: SupportAgentKnowledgeSourceSelection[]
}

export type SupportAgentSource = {
  id: string
  knowledgeSourceId: string
  title: string
  excerpt: string
}

export type SupportAgentRuntimeMetadata =
  | {
      mode: "demo"
    }
  | {
      mode: "model"
      provider: "openai"
      model: string
    }

export type SupportAgentChatResponse = {
  agentId: string
  conversationId: string
  messageId: string
  inReplyToMessageId: string
  answer: string
  sources: SupportAgentSource[]
  runtime?: SupportAgentRuntimeMetadata
  error?: string
}
