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
  sourceVersionId?: string
  chunkId?: string
  title: string
  excerpt: string
  freshnessStatus?: "fresh" | "stale" | "unknown"
  locationLabel?: string
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

export type HostedSupportAgentChatRuntimeHandoff = {
  deployment: {
    id: string
    publicName: string
    chatUrl: string
  }
  template: {
    id: "agent_support_template"
    name: string
  }
  runtime: {
    adapter: "flue-support-agent"
    requestContract: "SupportAgentChatRequest"
    apiEndpoint: string
    credentials: "server-side"
  }
  knowledge: {
    sourceIds: string[]
    contextReferences: Array<{
      knowledgeSourceId: string
      type: SupportAgentKnowledgeSourceSelection["contextReference"]["type"]
      path: string
    }>
  }
}
