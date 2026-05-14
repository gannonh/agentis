import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import {
  createSupportAgentModelRuntime,
  type SupportAgentTextGenerator,
} from "./model-runtime"
import type { SupportAgentProviderConfig } from "./provider-config"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("support-agent model runtime", () => {
  const config: SupportAgentProviderConfig = {
    provider: "openai",
    model: "test-model",
    apiKey: "sk-runtime-test",
  }

  test("maps Agentis chat requests through a model generator", async () => {
    const generateText = vi.fn(async () => ({
      text: "Select the documentation source, then ask your setup question.",
    }))
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText,
    })

    const response = await runtime.respond(supportAgentChatRequestFixture)

    expect(generateText).toHaveBeenCalledWith({
      config,
      system: "Answer as an Agentis support agent. Use only the selected knowledge sources when they are available.",
      prompt: [
        "Agent: agent_support_template",
        "Conversation: conversation_support_demo",
        "Message: message_user_setup_question",
        "Knowledge sources: knowledge_product_docs",
        "Documentation context:",
        [
          "Source: Product documentation sample",
          "Path: docs/knowledge/product-documentation-sample.md",
          "# Product documentation sample",
          "Setup: select Product documentation sample while configuring the support agent.",
          "Billing: use the billing article when customers ask about invoices, plan changes, or payment failures.",
          "Troubleshooting: ask for the workspace URL, affected feature, and latest error before escalating.",
        ].join("\n"),
        "Question: How do I connect a knowledge source?",
      ].join("\n"),
    })
    expect(response).toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_message_user_setup_question",
      inReplyToMessageId: "message_user_setup_question",
      answer: "Select the documentation source, then ask your setup question.",
      sources: [
        {
          id: "source_product_docs_setup",
          knowledgeSourceId: "knowledge_product_docs",
          title: "Product documentation sample",
          excerpt: "Select Product documentation sample during setup.",
        },
      ],
      runtime: {
        mode: "model",
        provider: "openai",
        model: "test-model",
      },
    })
    expect(response.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "test-model",
    })
    expect(JSON.stringify(response)).not.toContain("sk-runtime-test")
  })

  test("changes prompt context when selected documentation changes", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(async () => ({
      text: "Use the selected release notes.",
    }))
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText,
    })

    await runtime.respond({
      ...supportAgentChatRequestFixture,
      knowledgeSourceIds: ["knowledge_release_notes"],
      knowledgeSources: [
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

    const prompt = generateText.mock.calls[0]?.[0].prompt
    expect(prompt).toContain("# Release notes sample")
    expect(prompt).toContain("Path: docs/knowledge/release-notes-sample.md")
    expect(prompt).not.toContain("# Product documentation sample")
  })

  test("omits knowledge sources from the prompt when none were selected", async () => {
    const generateText = vi.fn(async () => ({
      text: "Ask your setup question without a selected source.",
    }))
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText,
    })

    await runtime.respond({
      ...supportAgentChatRequestFixture,
      knowledgeSourceIds: [],
    })

    expect(generateText).toHaveBeenCalledWith({
      config,
      system: "Answer as an Agentis support agent. Use only the selected knowledge sources when they are available.",
      prompt: [
        "Agent: agent_support_template",
        "Conversation: conversation_support_demo",
        "Message: message_user_setup_question",
        "Question: How do I connect a knowledge source?",
      ].join("\n"),
    })
  })

  test("normalizes provider call failures", async () => {
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText: vi.fn(async () => {
        throw new Error("Provider returned 500")
      }),
    })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CALL_FAILED",
        message: "Support agent provider call failed.",
      })
    )
  })

  test("normalizes aborted provider calls", async () => {
    const abortError = new Error("The request was aborted")
    abortError.name = "AbortError"
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText: vi.fn(async () => {
        throw abortError
      }),
    })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_ABORTED",
        message: "Support agent provider call was aborted.",
      })
    )
  })

  test("normalizes malformed provider output", async () => {
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText: vi.fn(async () => ({ text: "" })),
    })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_OUTPUT_MALFORMED",
        message: "Support agent provider returned an empty answer.",
      })
    )
  })

  test("normalizes non-string provider output", async () => {
    const runtime = createSupportAgentModelRuntime({
      config,
      generateText: vi.fn(async () => ({
        text: undefined as unknown as string,
      })),
    })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_OUTPUT_MALFORMED",
        message: "Support agent provider returned an empty answer.",
      })
    )
  })
})
