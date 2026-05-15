import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createSupportAgentHttpRuntime } from "./http-runtime"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("support-agent HTTP runtime", () => {
  test("posts chat requests to the support-agent API endpoint", async () => {
    const fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          agentId: supportAgentChatRequestFixture.agentId,
          conversationId: supportAgentChatRequestFixture.conversationId,
          messageId: `message_assistant_${supportAgentChatRequestFixture.messageId}`,
          inReplyToMessageId: supportAgentChatRequestFixture.messageId,
          answer: "Provider-backed answer from the server.",
          sources: [],
          runtime: {
            mode: "model",
            provider: "openai",
            model: "test-model",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    const response = await runtime.respond(supportAgentChatRequestFixture)

    expect(fetch).toHaveBeenCalledWith("/api/support-agent/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supportAgentChatRequestFixture),
    })
    expect(response.answer).toBe("Provider-backed answer from the server.")
    expect(response.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "test-model",
    })
  })

  test("maps typed server failures to support-agent runtime errors", async () => {
    const fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            runtimeCode: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
            message: "Provider configuration missing.",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Provider configuration missing.",
      })
    )
  })

  test("maps untyped server failures to generic errors", async () => {
    const fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "Support agent endpoint failed.",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new Error("Support agent endpoint failed.")
    )
  })

  test("uses a fallback message for untyped server failures", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: {} }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new Error("Support agent request failed.")
    )
  })
})
