import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"

export const supportAgentChatRequestFixture: SupportAgentChatRequest = {
  agentId: "agent_support_template",
  conversationId: "conversation_support_demo",
  messageId: "message_user_setup_question",
  question: "How do I connect a knowledge source?",
  knowledgeSourceIds: ["knowledge_product_docs"],
  knowledgeSources: [
    {
      id: "knowledge_product_docs",
      title: "Product documentation sample",
      description: "Product setup, billing, and troubleshooting articles.",
      contextReference: {
        type: "local-documentation",
        path: "docs/knowledge/product-documentation-sample.md",
      },
    },
  ],
}

export const supportAgentChatResponseFixture: SupportAgentChatResponse = {
  agentId: supportAgentChatRequestFixture.agentId,
  conversationId: supportAgentChatRequestFixture.conversationId,
  messageId: "message_assistant_setup_answer",
  inReplyToMessageId: supportAgentChatRequestFixture.messageId,
  answer: "Open the support template and select Product documentation sample.",
  sources: [
    {
      id: "citation_chunk_product_docs_setup",
      sourceVersionId: "ksrcv_product_docs_2026_05_19",
      chunkId: "chunk_product_docs_setup",
      knowledgeSourceId: "knowledge_product_docs",
      title: "Product documentation sample",
      excerpt: "Select Product documentation sample during setup.",
    },
  ],
}
