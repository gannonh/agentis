import { describe, expect, test, vi } from "vitest"

import {
  createHostedSupportAgentAccessToken,
  supportAgentChatRequestFixture,
} from "../lib/support-agent"
import type { SupportAgentTextGenerator } from "../lib/support-agent/model-runtime"
import {
  createSupportAgentWorkerFetch,
  type SupportAgentWorkerEnv,
} from "./support-agent-worker"

describe("support-agent Cloudflare Worker", () => {
  test("serves a root index pointing to support-agent Worker endpoints", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request("https://agentis-support-agent-preview.example.workers.dev/"),
      createEnv()
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/html")
    expect(html).toContain("Agentis support-agent preview Worker")
    expect(html).toContain("/support-agent/chat")
    expect(html).toContain("/support-agent/status")
    expect(html).toContain("/health")
    expect(html).not.toContain("sk-worker-secret")
    expect(html).not.toContain("access-token-value")
  })

  test("returns health status", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/health"
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      ok: true,
      service: "agentis-support-agent-preview",
    })
  })

  test("returns hosted deployment status without exposing Worker secrets", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/support-agent/status"
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      state: "deployed",
      title: "Deployment ready",
      userMessage: "The hosted support agent is ready to chat.",
      maintainerMessage:
        "Open the hosted chat URL and run the hosted acceptance script.",
      retryable: false,
      deployment: {
        id: "agentis-support-agent-preview",
        publicName: "Agentis support-agent preview",
        chatUrl:
          "https://agentis-support-agent-preview.example.workers.dev/support-agent/chat",
      },
    })
    expect(JSON.stringify(payload)).not.toContain("sk-worker-secret")
    expect(JSON.stringify(payload)).not.toContain("access-token-value")
  })

  test("returns actionable hosted deployment failure when server secrets are missing", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/support-agent/status"
      ),
      createEnv({ SUPPORT_AGENT_OPENAI_API_KEY: undefined })
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      state: "failed",
      title: "Deployment failed",
      failure: {
        code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
        title: "Server-side secret binding missing",
      },
    })
    expect(JSON.stringify(payload)).not.toContain("sk-worker-secret")
    expect(JSON.stringify(payload)).not.toContain("OPENAI_API_KEY")
  })

  test("treats whitespace-only Worker secrets as missing bindings", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/support-agent/status"
      ),
      createEnv({
        SUPPORT_AGENT_OPENAI_API_KEY: "   ",
        SUPPORT_AGENT_DEPLOYMENT_SECRET: "   ",
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      state: "failed",
      title: "Deployment failed",
      failure: {
        code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
      },
    })
  })

  test("serves a usable hosted support-agent chat page without exposing Worker secrets", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/support-agent/chat"
      ),
      createEnv()
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/html")
    expect(html).toContain("Agentis hosted support-agent web chat")
    expect(html).toContain(
      "Runtime boundary: Agentis-owned /api/support-agent/respond"
    )
    expect(html).toContain("Deployment status")
    expect(html).toContain("/support-agent/status")
    expect(html).toContain('<form id="support-agent-form"')
    expect(html).toContain('<input id="access-token"')
    expect(html).toContain('<textarea id="support-question"')
    expect(html).toContain("Ask support agent")
    expect(html).toContain("fetch(apiPath")
    expect(html).toContain("knowledge_product_docs")
    expect(html).not.toContain("sk-worker-secret")
    expect(html).not.toContain('value="access-token-value"')
  })

  test("hosted chat page submits questions to the Agentis runtime boundary and renders sources", async () => {
    const fetch = createSupportAgentWorkerFetch()
    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/support-agent/chat"
      ),
      createEnv()
    )
    const html = await response.text()
    const runtimeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            agentId: "agent_support_template",
            conversationId: "conversation_support_hosted",
            messageId: "message_assistant_hosted",
            inReplyToMessageId: "message_user_hosted",
            answer: "Hosted answer through Agentis runtime.",
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
              model: "gpt-5.4-mini",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    )
    vi.stubGlobal("fetch", runtimeFetch)
    try {
      document.documentElement.innerHTML = html
      const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1]

      expect(script).toBeDefined()
      new Function(script!)()
      const accessTokenInput = document.getElementById(
        "access-token"
      ) as HTMLInputElement
      accessTokenInput.value = "access-token-value"
      document
        .getElementById("support-agent-form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
      await vi.waitFor(() =>
        expect(document.body.textContent).toContain(
          "Hosted answer through Agentis runtime."
        )
      )

      expect(runtimeFetch).toHaveBeenCalledWith(
        "/api/support-agent/respond",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": "access-token-value",
          },
        })
      )
      expect(document.body.textContent).toContain(
        "Source: Product documentation sample"
      )
      expect(document.body.textContent).toContain(
        "Runtime: openai / gpt-5.4-mini"
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test("returns deployment failure for support-agent responses when server secrets are missing", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": "access-token-value",
          },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv({ SUPPORT_AGENT_DEPLOYMENT_SECRET: undefined })
    )
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toEqual({
      error: {
        runtimeCode: "SUPPORT_AGENT_HOSTED_BINDING_MISSING",
        message: "Server-side secret binding missing",
        title: "Deployment failed",
        userMessage: "The hosted support agent could not be deployed.",
        maintainerMessage:
          "Set the required server-side support-agent secret bindings, then rerun the Cloudflare preview deployment command.",
      },
    })
    expect(generateText).not.toHaveBeenCalled()
    expect(JSON.stringify(payload)).not.toContain("access-token-value")
  })

  test("rejects support-agent responses without the deployment access token", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({
      error: {
        runtimeCode: "SUPPORT_AGENT_HOSTED_ACCESS_DENIED",
        message: "Hosted support-agent access is required.",
        userMessage: "Enter the hosted deployment access token and retry.",
      },
    })
    expect(generateText).not.toHaveBeenCalled()
    expect(JSON.stringify(payload)).not.toContain("access-token-value")
  })

  test("serves support-agent responses after skipping an invalid header token", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": "wrong-token-value",
            authorization: "Bearer access-token-value",
          },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.answer).toBe("Worker model openai:gpt-5.4-mini answered.")
  })

  test("serves support-agent responses with bearer deployment access token", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: "Bearer access-token-value",
          },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.answer).toBe("Worker model openai:gpt-5.4-mini answered.")
  })

  test("rejects support-agent responses with an invalid derived access token", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": "wrong-token-value",
          },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv({ SUPPORT_AGENT_ACCESS_TOKEN: undefined })
    )

    expect(response.status).toBe(401)
    expect(generateText).not.toHaveBeenCalled()
  })

  test("serves support-agent responses with an access token derived from the deployment secret", async () => {
    const deploymentSecret = "deployment-secret"
    const derivedAccessToken =
      await createHostedSupportAgentAccessToken(deploymentSecret)
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": derivedAccessToken,
          },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv({
        SUPPORT_AGENT_DEPLOYMENT_SECRET: deploymentSecret,
        SUPPORT_AGENT_ACCESS_TOKEN: undefined,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.answer).toBe("Worker model openai:gpt-5.4-mini answered.")
    expect(JSON.stringify(payload)).not.toContain(deploymentSecret)
  })

  test("serves support-agent responses with Worker secrets server-side", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(
      async ({ config }) => ({
        text: `Worker model ${config.provider}:${config.model} answered.`,
      })
    )
    const fetch = createSupportAgentWorkerFetch({ generateText })

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/api/support-agent/respond",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": "access-token-value",
          },
          body: JSON.stringify(supportAgentChatRequestFixture),
        }
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          provider: "openai",
          model: "gpt-5.4-mini",
          apiKey: "sk-worker-secret",
        },
      })
    )
    expect(payload.answer).toBe("Worker model openai:gpt-5.4-mini answered.")
    expect(payload.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "gpt-5.4-mini",
    })
    expect(JSON.stringify(payload)).not.toContain("sk-worker-secret")
  })

  test("returns not found for unsupported paths", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request(
        "https://agentis-support-agent-preview.example.workers.dev/nope"
      ),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toEqual({ ok: false, error: "Not found" })
  })
})

function createEnv(
  overrides: Partial<SupportAgentWorkerEnv> = {}
): SupportAgentWorkerEnv {
  return {
    SUPPORT_AGENT_OPENAI_API_KEY: "sk-worker-secret",
    SUPPORT_AGENT_DEPLOYMENT_SECRET: "deployment-secret",
    SUPPORT_AGENT_ACCESS_TOKEN: "access-token-value",
    SUPPORT_AGENT_MODEL: "gpt-5.4-mini",
    ...overrides,
  }
}
