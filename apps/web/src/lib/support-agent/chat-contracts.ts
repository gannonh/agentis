export type SupportAgentChatRequest = {
  agentId: string
  conversationId: string
  messageId: string
  question: string
  knowledgeSourceIds: string[]
}

export type SupportAgentSource = {
  id: string
  knowledgeSourceId: string
  title: string
  excerpt: string
}

export type SupportAgentChatResponse = {
  agentId: string
  conversationId: string
  messageId: string
  inReplyToMessageId: string
  answer: string
  sources: SupportAgentSource[]
}
