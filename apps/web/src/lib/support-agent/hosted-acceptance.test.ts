import { describe, expect, test, vi } from "vitest"

import {
  resolveHostedSupportAgentAcceptanceOptions,
  runHostedSupportAgentAcceptance,
} from "./index"

describe("hosted support-agent acceptance runner", () => {
  test("resolves hosted deployment URL from Worker URL environment", () => {
    expect(
      resolveHostedSupportAgentAcceptanceOptions({
        args: [],
        env: {
          WORKERS_URL: "https://agentis-support-agent-preview.example.workers.dev",
        },
      })
    ).toEqual({
      mode: "hosted",
      deploymentUrl: "https://agentis-support-agent-preview.example.workers.dev",
      question: undefined,
    })
  })

  test("derives hosted deployment URL from Worker name and workers.dev subdomain", () => {
    expect(
      resolveHostedSupportAgentAcceptanceOptions({
        args: [],
        env: {
          AGENTIS_SUPPORT_WORKER_NAME: "agentis-support-agent-preview",
          WORKERS_DEV_SUBDOMAIN: "agentis-dev",
        },
      })
    ).toMatchObject({
      deploymentUrl: "https://agentis-support-agent-preview.agentis-dev.workers.dev",
    })
  })

  test("resolves dry-run mode and question overrides from CLI args", () => {
    expect(
      resolveHostedSupportAgentAcceptanceOptions({
        args: ["--dry-run", "--question", "Can the hosted support agent answer?"],
        env: {
          WORKERS_URL: "https://agentis-support-agent-preview.example.workers.dev",
          SUPPORT_AGENT_ACCEPTANCE_QUESTION: "ignored env question",
        },
      })
    ).toEqual({
      mode: "dry-run",
      deploymentUrl: "https://agentis-support-agent-preview.example.workers.dev",
      question: "Can the hosted support agent answer?",
    })
  })

  test("leaves deployment URL unresolved when no hosted target is configured", () => {
    expect(
      resolveHostedSupportAgentAcceptanceOptions({ args: [], env: {} })
    ).toEqual({
      mode: "hosted",
      deploymentUrl: undefined,
      question: undefined,
    })
  })

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
    ).rejects.toThrow(
      "deployment URL is required; set --deployment-url, SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL, WORKERS_URL, or AGENTIS_SUPPORT_WORKER_NAME with WORKERS_DEV_SUBDOMAIN"
    )
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

  test("uses deployed state as status evidence when hosted status has no title", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", { status: 200 })
      }

      if (url.endsWith("/api/support-agent/respond")) {
        return new Response(
          JSON.stringify({
            answer: "Hosted support-agent acceptance answer.",
            sources: [{ id: "source_product_docs_setup" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response(JSON.stringify({ state: "deployed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const report = await runHostedSupportAgentAcceptance({
      mode: "hosted",
      deploymentUrl: "https://billing-support-preview.example.workers.dev",
      fetch,
    })

    expect(report.steps.find((step) => step.id === "inspect-status")).toMatchObject({
      evidence: "deployed",
    })
  })

  test("fails loudly when hosted chat is unreachable", async () => {
    const fetch = vi.fn(async () => new Response("not found", { status: 404 }))

    await expect(
      runHostedSupportAgentAcceptance({
        mode: "hosted",
        deploymentUrl: "https://billing-support-preview.example.workers.dev",
        fetch,
      })
    ).rejects.toThrow("hosted chat URL failed with HTTP 404")
  })

  test("fails loudly when hosted chat page is not returned", async () => {
    const fetch = vi.fn(async () => new Response("unrelated page", { status: 200 }))

    await expect(
      runHostedSupportAgentAcceptance({
        mode: "hosted",
        deploymentUrl: "https://billing-support-preview.example.workers.dev",
        fetch,
      })
    ).rejects.toThrow(
      "hosted chat URL did not return the support-agent chat page"
    )
  })

  test("fails loudly when hosted response endpoint fails", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", { status: 200 })
      }

      return new Response("server error", { status: 500 })
    })

    await expect(
      runHostedSupportAgentAcceptance({
        mode: "hosted",
        deploymentUrl: "https://billing-support-preview.example.workers.dev",
        fetch,
      })
    ).rejects.toThrow("hosted support-agent response failed with HTTP 500")
  })

  test("fails loudly when hosted response lacks an answer", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", { status: 200 })
      }

      if (url.endsWith("/api/support-agent/respond")) {
        return new Response(
          JSON.stringify({
            agentId: "agent_support_template",
            conversationId: "conversation_support_hosted_acceptance",
            messageId: "message_assistant_acceptance",
            inReplyToMessageId: "message_user_acceptance",
            answer: "",
            sources: [{ id: "source_product_docs_setup" }],
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
    ).rejects.toThrow("hosted response requires a non-empty answer")
  })

  test("fails loudly when hosted status cannot be inspected", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", { status: 200 })
      }

      if (url.endsWith("/api/support-agent/respond")) {
        return new Response(
          JSON.stringify({
            answer: "Hosted support-agent acceptance answer.",
            sources: [{ id: "source_product_docs_setup" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response("not found", { status: 404 })
    })

    await expect(
      runHostedSupportAgentAcceptance({
        mode: "hosted",
        deploymentUrl: "https://billing-support-preview.example.workers.dev",
        fetch,
      })
    ).rejects.toThrow("hosted status inspection failed with HTTP 404")
  })

  test("fails loudly when hosted status is not deployed", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith("/support-agent/chat")) {
        return new Response("Agentis hosted support-agent web chat", { status: 200 })
      }

      if (url.endsWith("/api/support-agent/respond")) {
        return new Response(
          JSON.stringify({
            answer: "Hosted support-agent acceptance answer.",
            sources: [{ id: "source_product_docs_setup" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }

      return new Response(JSON.stringify({ state: "failed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    await expect(
      runHostedSupportAgentAcceptance({
        mode: "hosted",
        deploymentUrl: "https://billing-support-preview.example.workers.dev",
        fetch,
      })
    ).rejects.toThrow("hosted deployment status must be deployed")
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
