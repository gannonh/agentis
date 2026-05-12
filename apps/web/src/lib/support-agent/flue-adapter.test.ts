import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import type { SupportAgentChatResponse } from "./chat-contracts"
import {
  toFlueSupportAgentRuntimeInput,
  type SupportAgentRuntime,
} from "./flue-adapter"

describe("Flue support-agent adapter boundary", () => {
  test("maps Agentis chat requests into the Flue-ready runtime input", () => {
    expect(
      toFlueSupportAgentRuntimeInput(supportAgentChatRequestFixture)
    ).toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      userMessage: {
        id: "message_user_setup_question",
        content: "How do I connect a knowledge source?",
      },
      knowledgeSourceIds: ["knowledge_product_docs"],
    })
  })

  test("copies knowledge source IDs so adapted input is stable after request mutation", () => {
    const request = {
      ...supportAgentChatRequestFixture,
      knowledgeSourceIds: ["knowledge_product_docs"],
    }

    const input = toFlueSupportAgentRuntimeInput(request)
    request.knowledgeSourceIds.push("knowledge_release_notes")

    expect(input.knowledgeSourceIds).toEqual(["knowledge_product_docs"])
  })

  test("lets callers depend on the Agentis runtime boundary", async () => {
    const runtime: SupportAgentRuntime = {
      async respond(request) {
        const response: SupportAgentChatResponse = {
          agentId: request.agentId,
          conversationId: request.conversationId,
          messageId: "message_assistant_setup_answer",
          inReplyToMessageId: request.messageId,
          answer: "Use the selected documentation source.",
          sources: [],
        }

        return response
      },
    }

    await expect(runtime.respond(supportAgentChatRequestFixture)).resolves.toMatchObject({
      agentId: supportAgentChatRequestFixture.agentId,
      inReplyToMessageId: supportAgentChatRequestFixture.messageId,
    })
  })
})
