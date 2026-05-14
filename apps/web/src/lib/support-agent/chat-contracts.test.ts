import { describe, expect, test } from "vitest"

import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"

describe("support-agent chat contracts", () => {
  test("exposes Agentis-owned request and response fields for app code", () => {
    const request: SupportAgentChatRequest = {
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

    const response: SupportAgentChatResponse = {
      agentId: request.agentId,
      conversationId: request.conversationId,
      messageId: "message_assistant_setup_answer",
      inReplyToMessageId: request.messageId,
      answer:
        "Open the support template and select Product documentation sample.",
      sources: [
        {
          id: "source_product_docs_setup",
          knowledgeSourceId: "knowledge_product_docs",
          title: "Product documentation sample",
          excerpt: "Select Product documentation sample during setup.",
        },
      ],
    }

    expect(response.agentId).toBe(request.agentId)
    expect(response.conversationId).toBe(request.conversationId)
    expect(response.sources[0]?.knowledgeSourceId).toBe(
      request.knowledgeSourceIds[0]
    )
  })

  test("allows callers to pattern-match support-agent runtime failures", () => {
    const response: SupportAgentChatResponse = {
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_setup_error",
      inReplyToMessageId: "message_user_setup_question",
      answer: "",
      sources: [],
      error: "Flue request timed out.",
    }

    expect(response.error).toBe("Flue request timed out.")
  })
})
