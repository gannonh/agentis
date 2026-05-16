import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "../lib/support-agent"
import type { SupportAgentTextGenerator } from "../lib/support-agent/model-runtime"
import {
  createSupportAgentWorkerFetch,
  type SupportAgentWorkerEnv,
} from "./support-agent-worker"

describe("support-agent Cloudflare Worker", () => {
  test("returns health status", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request("https://agentis-support-agent-preview.example.workers.dev/health"),
      createEnv()
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      ok: true,
      service: "agentis-support-agent-preview",
    })
  })

  test("serves the hosted support-agent chat path without exposing Worker secrets", async () => {
    const fetch = createSupportAgentWorkerFetch()

    const response = await fetch(
      new Request("https://agentis-support-agent-preview.example.workers.dev/support-agent/chat"),
      createEnv()
    )
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/html")
    expect(html).toContain("Agentis hosted support-agent web chat")
    expect(html).toContain("/api/support-agent/respond")
    expect(html).not.toContain("sk-worker-secret")
    expect(html).not.toContain("deployment-secret")
  })

  test("serves support-agent responses with Worker secrets server-side", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(async ({ config }) => ({
      text: `Worker model ${config.provider}:${config.model} answered.`,
    }))
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
      new Request("https://agentis-support-agent-preview.example.workers.dev/nope"),
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
    SUPPORT_AGENT_MODEL: "gpt-5.4-mini",
    ...overrides,
  }
}
