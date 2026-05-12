import { describe, expect, test } from "vitest"

import {
  supportAgentChatRequestFixture,
  supportAgentChatResponseFixture,
} from "./chat-fixtures"

describe("support-agent chat fixtures", () => {
  test("include stable chat identifiers and cited source metadata", () => {
    expect(supportAgentChatRequestFixture).toMatchObject({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_user_setup_question",
      question: "How do I connect a knowledge source?",
      knowledgeSourceIds: ["knowledge_product_docs"],
    })

    expect(supportAgentChatResponseFixture).toMatchObject({
      agentId: supportAgentChatRequestFixture.agentId,
      conversationId: supportAgentChatRequestFixture.conversationId,
      messageId: "message_assistant_setup_answer",
      inReplyToMessageId: supportAgentChatRequestFixture.messageId,
    })
    expect(supportAgentChatResponseFixture.sources).toEqual([
      {
        id: "source_product_docs_setup",
        knowledgeSourceId: "knowledge_product_docs",
        title: "Product documentation sample",
        excerpt: "Select Product documentation sample during setup.",
      },
    ])
  })
})
