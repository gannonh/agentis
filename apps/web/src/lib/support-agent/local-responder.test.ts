import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createLocalSupportAgentResponder } from "./local-responder"

describe("local support-agent responder", () => {
  test("returns a deterministic cited answer linked to the submitted question", async () => {
    const responder = createLocalSupportAgentResponder()
    const request = {
      ...supportAgentChatRequestFixture,
      messageId: "message_user_billing_question",
      question: "How do I troubleshoot billing?",
      knowledgeSourceIds: ["knowledge_product_docs"],
    }

    const response = await responder.respond(request)

    expect(response).toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_message_user_billing_question",
      inReplyToMessageId: "message_user_billing_question",
      answer: "Use Product documentation sample to answer: How do I troubleshoot billing?",
      sources: [
        {
          id: "citation_chunk_product_docs_setup",
          knowledgeSourceId: "knowledge_product_docs",
          sourceVersionId: "ksrcv_product_docs_2026_05_19",
          chunkId: "chunk_product_docs_setup",
          title: "Product documentation sample",
          excerpt: "Select Product documentation sample during setup.",
          freshnessStatus: "fresh",
          locationLabel: "Setup",
        },
      ],
      runtime: { mode: "demo" },
    })
  })

  test("uses a stable empty-context answer prefix when no docs are selected", async () => {
    const responder = createLocalSupportAgentResponder()
    const request = {
      ...supportAgentChatRequestFixture,
      question: "How do I troubleshoot billing?",
      knowledgeSourceIds: [],
      knowledgeSources: [],
    }

    await expect(responder.respond(request)).resolves.toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_message_user_setup_question",
      inReplyToMessageId: "message_user_setup_question",
      answer:
        "Answer using available support context: How do I troubleshoot billing?",
      sources: [],
      runtime: { mode: "demo" },
    })
  })
})
