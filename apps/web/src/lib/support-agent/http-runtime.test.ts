import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import {
  createHostedSupportAgentHttpRuntime,
  createSupportAgentHttpRuntime,
} from "./http-runtime"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("support-agent HTTP runtime", () => {
  test("posts chat requests to the support-agent API endpoint", async () => {
    const fetch = vi.fn(
      async () =>
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

  test("posts hosted chat requests to the deployed support-agent API endpoint", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            agentId: supportAgentChatRequestFixture.agentId,
            conversationId: supportAgentChatRequestFixture.conversationId,
            messageId: `message_assistant_${supportAgentChatRequestFixture.messageId}`,
            inReplyToMessageId: supportAgentChatRequestFixture.messageId,
            answer: "Hosted support-agent answer from Cloudflare preview.",
            sources: [
              {
                id: "source_product_docs_setup",
                knowledgeSourceId: "knowledge_product_docs",
                title: "Product documentation sample",
                excerpt: "Select Product documentation sample during setup.",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    )
    const runtime = createHostedSupportAgentHttpRuntime({
      deploymentAccessToken: " access-token-value ",
      handoff: {
        deployment: {
          id: "deployment_billing_support_preview",
          publicName: "Billing support preview",
          chatUrl:
            "https://billing-support-preview.example.workers.dev/support-agent/chat",
        },
        template: {
          id: "agent_support_template",
          name: "Billing support",
        },
        runtime: {
          adapter: "flue-support-agent",
          requestContract: "SupportAgentChatRequest",
          apiEndpoint:
            "https://billing-support-preview.example.workers.dev/api/support-agent/respond",
          credentials: "server-side",
        },
        knowledge: {
          sourceIds: ["knowledge_product_docs"],
          contextReferences: [
            {
              knowledgeSourceId: "knowledge_product_docs",
              type: "local-documentation",
              path: "docs/knowledge/product-documentation-sample.md",
            },
          ],
        },
      },
      fetch,
    })

    const response = await runtime.respond(supportAgentChatRequestFixture)

    expect(fetch).toHaveBeenCalledWith(
      "https://billing-support-preview.example.workers.dev/api/support-agent/respond",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agentis-access-token": "access-token-value",
        },
        body: JSON.stringify(supportAgentChatRequestFixture),
      })
    )
    expect(response.answer).toBe(
      "Hosted support-agent answer from Cloudflare preview."
    )
    expect(response.sources[0]?.knowledgeSourceId).toBe(
      "knowledge_product_docs"
    )
  })

  test("rejects hosted runtimes without a deployment access token", () => {
    expect(() =>
      createHostedSupportAgentHttpRuntime({
        deploymentAccessToken: "   ",
        handoff: {
          deployment: {
            id: "deployment_billing_support_preview",
            publicName: "Billing support preview",
            chatUrl:
              "https://billing-support-preview.example.workers.dev/support-agent/chat",
          },
          template: {
            id: "agent_support_template",
            name: "Billing support",
          },
          runtime: {
            adapter: "flue-support-agent",
            requestContract: "SupportAgentChatRequest",
            apiEndpoint:
              "https://billing-support-preview.example.workers.dev/api/support-agent/respond",
            credentials: "server-side",
          },
          knowledge: {
            sourceIds: ["knowledge_product_docs"],
            contextReferences: [],
          },
        },
      })
    ).toThrow("hosted deployment access token is required")
  })

  test("rejects hosted chat handoffs with invalid deployment metadata", () => {
    expect(() =>
      createHostedSupportAgentHttpRuntime({
        deploymentAccessToken: "access-token-value",
        handoff: {
          deployment: {
            id: "deployment_billing_support_preview",
            publicName: "Billing support preview",
            chatUrl:
              "https://billing-support-preview.example.workers.dev/support-agent/chat",
          },
          template: {
            id: "agent_support_template",
            name: "Billing support",
          },
          runtime: {
            adapter: "browser-provider-call",
            requestContract: "SupportAgentChatRequest",
            apiEndpoint: "",
            credentials: "server-side",
          },
          knowledge: {
            sourceIds: ["knowledge_product_docs"],
            contextReferences: [],
          },
        } as never,
      })
    ).toThrow(
      "hosted support-agent handoff must use the server runtime API boundary"
    )
  })

  test("maps typed server failures to support-agent runtime errors", async () => {
    const fetch = vi.fn(
      async () =>
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

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Provider configuration missing.",
      })
    )
  })

  test("maps untyped server failures to generic errors", async () => {
    const fetch = vi.fn(
      async () =>
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

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toEqual(new Error("Support agent endpoint failed."))
  })

  test("uses a fallback message for untyped server failures", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: {} }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toEqual(new Error("Support agent request failed."))
  })

  test("maps empty server failures to generic errors", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(null, {
          status: 502,
        })
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toEqual(new Error("Support agent request failed."))
  })

  test("maps non-JSON server failures to generic errors", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("<html>Gateway error</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        })
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toEqual(new Error("Support agent request failed."))
  })

  test("rejects successful non-JSON responses as invalid server responses", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("not json", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toEqual(
      new Error("Support agent server returned an invalid response format.")
    )
  })
})
