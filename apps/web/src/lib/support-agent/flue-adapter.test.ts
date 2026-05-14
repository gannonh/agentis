import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import type { SupportAgentChatResponse } from "./chat-contracts"
import { toFlueSupportAgentRuntimeInput } from "./flue-adapter"
import type { SupportAgentRuntime } from "./runtime-boundary"

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
      documentationContext: [
        {
          knowledgeSourceId: "knowledge_product_docs",
          title: "Product documentation sample",
          path: "docs/knowledge/product-documentation-sample.md",
          content: [
            "# Product documentation sample",
            "Setup: select Product documentation sample while configuring the support agent.",
            "Billing: use the billing article when customers ask about invoices, plan changes, or payment failures.",
            "Troubleshooting: ask for the workspace URL, affected feature, and latest error before escalating.",
          ].join("\n"),
        },
      ],
    })
  })

  test("copies knowledge source IDs so adapted input is stable after request mutation", () => {
    const request = {
      ...supportAgentChatRequestFixture,
      knowledgeSourceIds: ["knowledge_product_docs"],
    }

    const input = toFlueSupportAgentRuntimeInput(request)
    request.knowledgeSourceIds.push("knowledge_release_notes")
    request.knowledgeSources[0]!.title = "Changed title"
    request.knowledgeSources[0]!.contextReference.path = "changed.md"

    expect(input.knowledgeSourceIds).toEqual(["knowledge_product_docs"])
    expect(input.knowledgeSources).toEqual([
      {
        id: "knowledge_product_docs",
        title: "Product documentation sample",
        description: "Product setup, billing, and troubleshooting articles.",
        contextReference: {
          type: "local-documentation",
          path: "docs/knowledge/product-documentation-sample.md",
        },
      },
    ])
    expect(input.documentationContext[0]?.path).toBe(
      "docs/knowledge/product-documentation-sample.md"
    )
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
