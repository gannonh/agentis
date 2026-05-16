import { describe, expect, test, vi } from "vitest"

import { runHostedSupportAgentAcceptance } from "./index"

describe("hosted support-agent acceptance runner", () => {
  test("runs a clearly labeled deterministic dry-run covering hosted acceptance steps", async () => {
    const report = await runHostedSupportAgentAcceptance({ mode: "dry-run" })

    expect(report).toMatchObject({
      mode: "dry-run",
      evidenceKind: "deterministic-dry-run",
      completed: true,
    })
    expect(report.steps.map((step) => step.id)).toEqual([
      "configure",
      "deploy-plan",
      "open-hosted-chat",
      "ask",
      "answer",
      "cite",
      "inspect-status",
      "failure-handling",
    ])
    expect(report.steps.every((step) => step.status === "passed")).toBe(true)
    expect(report.notes).toContain(
      "Dry-run validates command logic only; run hosted mode for deployed evidence."
    )
    expect(JSON.stringify(report)).not.toContain("sk-live-secret")
  })

  test("fails loudly in hosted mode when the deployment URL is missing", async () => {
    await expect(
      runHostedSupportAgentAcceptance({ mode: "hosted" })
    ).rejects.toThrow("SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL is required")
  })

  test("runs hosted acceptance against chat, respond, status, and failure contract paths", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      }

      if (url.endsWith("/api/support-agent/respond")) {
        return new Response(
          JSON.stringify({
            agentId: "agent_support_template",
            conversationId: "conversation_support_hosted_acceptance",
            messageId: "message_assistant_acceptance",
            inReplyToMessageId: "message_user_acceptance",
            answer: "Hosted support-agent acceptance answer.",
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
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      if (url.endsWith("/support-agent/status")) {
        return new Response(
          JSON.stringify({
            state: "deployed",
            title: "Deployment ready",
            userMessage: "The hosted support agent is ready to chat.",
            maintainerMessage:
              "Open the hosted chat URL and run the hosted acceptance script.",
            retryable: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response("not found", { status: 404 })
    })

    const report = await runHostedSupportAgentAcceptance({
      mode: "hosted",
      deploymentUrl: "https://billing-support-preview.example.workers.dev",
      fetch,
    })

    expect(report.completed).toBe(true)
    expect(report.mode).toBe("hosted")
    expect(report.evidenceKind).toBe("hosted")
    expect(fetch).toHaveBeenCalledWith(
      "https://billing-support-preview.example.workers.dev/support-agent/chat"
    )
    expect(fetch).toHaveBeenCalledWith(
      "https://billing-support-preview.example.workers.dev/support-agent/status"
    )
    expect(fetch).toHaveBeenCalledWith(
      "https://billing-support-preview.example.workers.dev/api/support-agent/respond",
      expect.objectContaining({ method: "POST" })
    )
  })

  test("fails loudly when hosted response lacks citation-capable sources", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", {
          status: 200,
        })
      }

      if (url.endsWith("/api/support-agent/respond")) {
        return new Response(
          JSON.stringify({
            agentId: "agent_support_template",
            conversationId: "conversation_support_hosted_acceptance",
            messageId: "message_assistant_acceptance",
            inReplyToMessageId: "message_user_acceptance",
            answer: "Hosted answer without sources.",
            sources: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({ state: "deployed", title: "Deployment ready" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    })

    await expect(
      runHostedSupportAgentAcceptance({
        mode: "hosted",
        deploymentUrl: "https://billing-support-preview.example.workers.dev",
        fetch,
      })
    ).rejects.toThrow("citation-capable response requires at least one source")
  })
})
