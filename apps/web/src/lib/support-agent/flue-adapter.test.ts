import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import type { SupportAgentChatResponse } from "./chat-contracts"
import {
  toFlueSupportAgentRuntimeInput,
  toSupportAgentChatResponse,
} from "./flue-adapter"
import {
  SupportAgentRuntimeError,
  type SupportAgentRuntime,
} from "./runtime-boundary"

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

  test("keeps mapped knowledgeSources scoped to selected IDs", () => {
    const input = toFlueSupportAgentRuntimeInput({
      ...supportAgentChatRequestFixture,
      knowledgeSourceIds: ["knowledge_release_notes"],
      knowledgeSources: [
        ...supportAgentChatRequestFixture.knowledgeSources,
        {
          id: "knowledge_release_notes",
          title: "Release notes sample",
          description: "Recent product updates and support-agent changes.",
          contextReference: {
            type: "local-documentation",
            path: "docs/knowledge/release-notes-sample.md",
          },
        },
      ],
    })

    expect(input.knowledgeSourceIds).toEqual(["knowledge_release_notes"])
    expect(input.knowledgeSources).toEqual([
      {
        id: "knowledge_release_notes",
        title: "Release notes sample",
        description: "Recent product updates and support-agent changes.",
        contextReference: {
          type: "local-documentation",
          path: "docs/knowledge/release-notes-sample.md",
        },
      },
    ])
  })

  test("maps Flue-shaped assistant answers into the Agentis chat response contract", () => {
    const response = toSupportAgentChatResponse(supportAgentChatRequestFixture, {
      runId: "flue_run_123",
      provider: {
        name: "openai",
        apiKey: "sk-runtime-secret",
      },
      assistantMessage: {
        id: "message_assistant_flue_setup_answer",
        inReplyToMessageId: "message_user_setup_question",
        content: "Select Product documentation sample before asking setup questions.",
      },
      provenance: [
        {
          sourceId: "source_product_docs_setup",
          knowledgeSourceId: "knowledge_product_docs",
          title: "Product documentation sample",
          excerpt: "Select Product documentation sample during setup.",
          runtimePath: "r2://agentis/private/context.json",
        },
      ],
      runtimeMetadata: {
        traceId: "trace-secret-runtime-only",
      },
    })

    expect(response).toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_flue_setup_answer",
      inReplyToMessageId: "message_user_setup_question",
      answer: "Select Product documentation sample before asking setup questions.",
      sources: [
        {
          id: "source_product_docs_setup",
          knowledgeSourceId: "knowledge_product_docs",
          title: "Product documentation sample",
          excerpt: "Select Product documentation sample during setup.",
        },
      ],
    })
    expect(JSON.stringify(response)).not.toContain("sk-runtime-secret")
    expect(JSON.stringify(response)).not.toContain("trace-secret-runtime-only")
    expect(JSON.stringify(response)).not.toContain("r2://agentis/private")
  })

  test("raises a typed failure when selected-source provenance is unavailable", () => {
    expect(() =>
      toSupportAgentChatResponse(supportAgentChatRequestFixture, {
        assistantMessage: {
          id: "message_assistant_flue_uncited_answer",
          content: "Answer without source metadata.",
        },
      })
    ).toThrow(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE",
        message: "Support agent response did not include citation data.",
      })
    )
  })

  test("falls back to the submitted message ID and empty sources when no source was selected", () => {
    expect(
      toSupportAgentChatResponse(
        {
          ...supportAgentChatRequestFixture,
          knowledgeSourceIds: [],
          knowledgeSources: [],
        },
        {
          assistantMessage: {
            id: "message_assistant_flue_uncited_answer",
            content: "Answer without source metadata.",
          },
        }
      )
    ).toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_flue_uncited_answer",
      inReplyToMessageId: "message_user_setup_question",
      answer: "Answer without source metadata.",
      sources: [],
    })
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
