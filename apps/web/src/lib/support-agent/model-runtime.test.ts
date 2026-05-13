import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createSupportAgentModelRuntime } from "./model-runtime"
import type { SupportAgentProviderConfig } from "./provider-config"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("support-agent model runtime", () => {
  const config: SupportAgentProviderConfig = {
    provider: "openai",
    model: "gpt-5.4-mini",
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
