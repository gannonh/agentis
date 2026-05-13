import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createSupportAgentModelRuntime } from "./model-runtime"
import type { SupportAgentProviderConfig } from "./provider-config"

describe("support-agent model runtime", () => {
  test("maps Agentis chat requests through a model generator", async () => {
    const config: SupportAgentProviderConfig = {
      provider: "openai",
      model: "gpt-4.1-mini",
      apiKey: "sk-runtime-test",
    }
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
        "Question: How do I connect a knowledge source?",
      ].join("\n"),
    })
    expect(response).toEqual({
      agentId: "agent_support_template",
      conversationId: "conversation_support_demo",
      messageId: "message_assistant_message_user_setup_question",
      inReplyToMessageId: "message_user_setup_question",
      answer: "Select the documentation source, then ask your setup question.",
      sources: [],
    })
    expect(JSON.stringify(response)).not.toContain("sk-runtime-test")
  })
})
