import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import { App } from "./App"
import {
  createLocalSupportAgentResponder,
  SupportAgentRuntimeError,
  type SupportAgentChatRequest,
  type SupportAgentChatResponse,
  type SupportAgentRuntime,
} from "./lib/support-agent"

describe("App", () => {
  async function submitSupportQuestion(
    user: ReturnType<typeof userEvent.setup>,
    question = "How do I connect a knowledge source?"
  ) {
    if (!screen.queryByText("Selected source: Product documentation sample")) {
      await user.click(
        screen.getByRole("button", { name: "Product documentation sample" })
      )
    }
    await user.type(screen.getByLabelText("Support question"), question)
    await user.click(screen.getByRole("button", { name: "Ask support agent" }))
  }

  function renderAppWithDemoRuntime() {
    return render(<App supportAgentResponder={createLocalSupportAgentResponder()} />)
  }

  test("shows the support-agent template entry from the initial route", () => {
    render(<App />)

    expect(
      screen.getByRole("heading", {
        name: "Configure a support agent",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Start with support agent" })
    ).toBeInTheDocument()
  })

  test("updates the template preview when the support-agent name changes", async () => {
    const user = userEvent.setup()
    render(<App />)

    const templateName = screen.getByLabelText("Template name")
    await user.clear(templateName)
    await user.type(templateName, "Billing support")

    expect(
      screen.getByRole("heading", { name: "Billing support" })
    ).toBeInTheDocument()
  })

  test("selects sample documentation for the support-agent template", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole("button", { name: "Product documentation sample" })
    )

    expect(
      screen.getByText("Selected source: Product documentation sample")
    ).toBeInTheDocument()
  })

  test("requires a selected knowledge source before submitting a support question", async () => {
    const user = userEvent.setup()
    render(<App />)

    const supportQuestion = screen.getByLabelText("Support question")
    await user.type(supportQuestion, "How do I connect a knowledge source?")
    fireEvent.submit(supportQuestion.closest("form")!)

    expect(screen.queryByText("User")).not.toBeInTheDocument()
    expect(
      screen.getByText("Select sample documentation to continue setup.")
    ).toBeInTheDocument()
  })

  test("submits a support question through the Agentis chat path", async () => {
    const user = userEvent.setup()
    renderAppWithDemoRuntime()

    await submitSupportQuestion(user)

    expect(
      screen.getByText("How do I connect a knowledge source?")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "agent_support_template / conversation_support_demo / message_user_setup_question / knowledge_product_docs"
      )
    ).toBeInTheDocument()
  })

  test("delegates support chat through the configured runtime", async () => {
    const user = userEvent.setup()
    const supportAgentResponder: SupportAgentRuntime = {
      respond: vi.fn(async (request) => ({
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: `message_assistant_${request.messageId}`,
        inReplyToMessageId: request.messageId,
        answer: "Configured runtime handled the support question.",
        sources: [],
      })),
    }
    render(<App supportAgentResponder={supportAgentResponder} />)

    await submitSupportQuestion(user)

    expect(supportAgentResponder.respond).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent_support_template",
        conversationId: "conversation_support_demo",
        messageId: "message_user_setup_question",
        question: "How do I connect a knowledge source?",
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
      })
    )
    expect(
      screen.getByText("Configured runtime handled the support question.")
    ).toBeInTheDocument()
  })

  test("uses the server-backed support-agent runtime by default", async () => {
    const user = userEvent.setup()
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          agentId: "agent_support_template",
          conversationId: "conversation_support_demo",
          messageId: "message_assistant_message_user_setup_question",
          inReplyToMessageId: "message_user_setup_question",
          answer: "Real provider-backed answer from local dev endpoint.",
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
    )

    render(<App />)

    await submitSupportQuestion(user)

    expect(fetch).toHaveBeenCalledWith("/api/support-agent/respond", expect.any(Object))
    expect(
      await screen.findByText("Real provider-backed answer from local dev endpoint.")
    ).toBeInTheDocument()
    expect(screen.getByText("Runtime: OpenAI / test-model")).toBeInTheDocument()
    fetch.mockRestore()
  })

  test("renders submitted user and assistant transcript messages", async () => {
    const user = userEvent.setup()
    renderAppWithDemoRuntime()

    await submitSupportQuestion(user)

    expect(screen.getByText("User")).toBeInTheDocument()
    expect(
      screen.getByText("How do I connect a knowledge source?")
    ).toBeInTheDocument()
    expect(screen.getByText("Assistant")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Use Product documentation sample to answer: How do I connect a knowledge source?"
      )
    ).toBeInTheDocument()
  })

  test("renders cited source metadata for assistant answers", async () => {
    const user = userEvent.setup()
    renderAppWithDemoRuntime()

    await submitSupportQuestion(user)

    expect(
      screen.getByText("Source: Product documentation sample")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Source ID: source_product_docs_setup")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Select Product documentation sample during setup.")
    ).toBeInTheDocument()
  })

  test("renders provenance for the source selected when the question is submitted", async () => {
    const user = userEvent.setup()
    renderAppWithDemoRuntime()

    await user.click(
      screen.getByRole("button", { name: "Product documentation sample" })
    )
    await user.click(screen.getByRole("button", { name: "Release notes sample" }))
    await user.type(screen.getByLabelText("Support question"), "What changed?")
    await user.click(screen.getByRole("button", { name: "Ask support agent" }))

    expect(screen.getByText("Source: Release notes sample")).toBeInTheDocument()
    expect(screen.getByText("Source ID: source_release_notes_may")).toBeInTheDocument()
    expect(
      screen.getByText(
        "May release notes summarize the newest support-agent changes."
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Source: Product documentation sample")
    ).not.toBeInTheDocument()
  })

  test("keeps earlier support questions in the transcript", async () => {
    const user = userEvent.setup()
    renderAppWithDemoRuntime()

    await submitSupportQuestion(user, "How do I connect a knowledge source?")
    await submitSupportQuestion(user, "How do I troubleshoot billing?")

    expect(
      screen.getByText("How do I connect a knowledge source?")
    ).toBeInTheDocument()
    expect(screen.getByText("How do I troubleshoot billing?")).toBeInTheDocument()
    expect(screen.getAllByText("User")).toHaveLength(2)
    expect(screen.getAllByText("Assistant")).toHaveLength(2)
  })

  test("prevents concurrent support question submits from duplicating a turn", async () => {
    const user = userEvent.setup()
    let resolveResponse: (response: SupportAgentChatResponse) => void
    const supportAgentResponder: SupportAgentRuntime = {
      respond: vi.fn(
        () =>
          new Promise<SupportAgentChatResponse>((resolve) => {
            resolveResponse = resolve
          })
      ),
    }
    render(<App supportAgentResponder={supportAgentResponder} />)

    await user.click(
      screen.getByRole("button", { name: "Product documentation sample" })
    )
    await user.type(
      screen.getByLabelText("Support question"),
      "How do I connect a knowledge source?"
    )
    const form = screen.getByLabelText("Support question").closest("form")!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(supportAgentResponder.respond).toHaveBeenCalledTimes(1)

    const request = vi.mocked(supportAgentResponder.respond).mock
      .calls[0][0] as SupportAgentChatRequest
    resolveResponse!({
      agentId: request.agentId,
      conversationId: request.conversationId,
      messageId: `message_assistant_${request.messageId}`,
      inReplyToMessageId: request.messageId,
      answer: "Use Product documentation sample to answer: How do I connect a knowledge source?",
      sources: [],
    })

    expect(await screen.findAllByText("User")).toHaveLength(1)
    expect(screen.getByLabelText("Support question")).toHaveValue("")
  })

  test("rejects assistant responses that are not linked to the submitted message", async () => {
    const user = userEvent.setup()
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    const supportAgentResponder: SupportAgentRuntime = {
      respond: vi.fn(async (request) => ({
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: "message_assistant_wrong_reply",
        inReplyToMessageId: "message_user_previous_question",
        answer: "This answer is linked to an earlier user message.",
        sources: [],
      })),
    }
    render(<App supportAgentResponder={supportAgentResponder} />)

    await submitSupportQuestion(user, "How do I connect a knowledge source?")

    expect(
      await screen.findByText("Answer generation failed")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Support question")).toHaveValue(
      "How do I connect a knowledge source?"
    )
    expect(screen.queryByText("Assistant")).not.toBeInTheDocument()
    expect(
      screen.queryByText("This answer is linked to an earlier user message.")
    ).not.toBeInTheDocument()
    expect(consoleError.mock.calls[0]?.[0]).toBe("Support agent response failed")
    consoleError.mockRestore()
  })

  test.each([
    {
      code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING" as const,
      title: "Provider configuration missing",
      userMessage:
        "The support agent needs provider credentials before it can answer.",
      maintainerMessage:
        "Set the support-agent provider environment variables, then retry the local demo.",
    },
    {
      code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN" as const,
      title: "Documentation context unavailable",
      userMessage:
        "The selected documentation could not be prepared for this question.",
      maintainerMessage:
        "Check that each selected source ID and local documentation path is registered for the demo.",
    },
    {
      code: "SUPPORT_AGENT_PROVIDER_CALL_FAILED" as const,
      title: "Answer generation failed",
      userMessage: "The support agent could not generate an answer right now.",
      maintainerMessage:
        "Inspect provider connectivity and retry the same question after the provider recovers.",
    },
    {
      code: "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE" as const,
      title: "Citation data unavailable",
      userMessage:
        "The support agent answered without citation data, so the answer was not shown.",
      maintainerMessage:
        "Verify the runtime returned provenance for every selected demo source before accepting the answer.",
    },
  ])(
    "surfaces $code as typed demo failure copy",
    async ({ code, title, userMessage, maintainerMessage }) => {
      const user = userEvent.setup()
      const runtimeError = new SupportAgentRuntimeError({
        code,
        message: "Raw provider error with sk-live-secret and stack trace",
      })
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined)
      const supportAgentResponder: SupportAgentRuntime = {
        respond: vi.fn(async () => {
          throw runtimeError
        }),
      }
      render(<App supportAgentResponder={supportAgentResponder} />)

      await submitSupportQuestion(user, "How do I connect a knowledge source?")

      expect(await screen.findByText(title)).toBeInTheDocument()
      expect(screen.getByRole("alert")).toHaveTextContent(title)
      expect(screen.getAllByText(userMessage).length).toBeGreaterThan(0)
      expect(screen.getByText(maintainerMessage)).toBeInTheDocument()
      expect(screen.getByText(`Runtime code: ${code}`)).toBeInTheDocument()
      expect(screen.getByLabelText("Support question")).toHaveValue(
        "How do I connect a knowledge source?"
      )
      expect(screen.queryByText("Assistant")).not.toBeInTheDocument()
      expect(screen.queryByText(/sk-live-secret/)).not.toBeInTheDocument()
      expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument()
      expect(consoleError).toHaveBeenCalledWith(
        "Support agent response failed",
        runtimeError
      )
      consoleError.mockRestore()
    }
  )

  test("surfaces unknown runtime failures without a runtime code", async () => {
    const user = userEvent.setup()
    const runtimeError = new Error("Unhandled runtime failure with sk-live-secret")
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    const supportAgentResponder: SupportAgentRuntime = {
      respond: vi.fn(async () => {
        throw runtimeError
      }),
    }
    render(<App supportAgentResponder={supportAgentResponder} />)

    await submitSupportQuestion(user, "How do I connect a knowledge source?")

    expect(await screen.findByText("Answer generation failed")).toBeInTheDocument()
    expect(
      screen.getAllByText("The support agent could not generate an answer right now.").length
    ).toBeGreaterThan(0)
    expect(screen.queryByText(/Runtime code:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sk-live-secret/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(
      "Support agent response failed",
      runtimeError
    )
    consoleError.mockRestore()
  })

  test("clears stale failure state after a later successful support answer", async () => {
    const user = userEvent.setup()
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    const supportAgentResponder: SupportAgentRuntime = {
      respond: vi
        .fn<SupportAgentRuntime["respond"]>()
        .mockRejectedValueOnce(
          new SupportAgentRuntimeError({
            code: "SUPPORT_AGENT_PROVIDER_CALL_FAILED",
            message: "Provider failed",
          })
        )
        .mockImplementationOnce(async (request) => ({
          agentId: request.agentId,
          conversationId: request.conversationId,
          messageId: `message_assistant_${request.messageId}`,
          inReplyToMessageId: request.messageId,
          answer: "Configured runtime handled the support question.",
          sources: [
            {
              id: "source_product_docs_setup",
              knowledgeSourceId: "knowledge_product_docs",
              title: "Product documentation sample",
              excerpt: "Select Product documentation sample during setup.",
            },
          ],
        })),
    }
    render(<App supportAgentResponder={supportAgentResponder} />)

    await submitSupportQuestion(user, "How do I connect a knowledge source?")
    expect(await screen.findByText("Answer generation failed")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ask support agent" }))

    expect(
      await screen.findByText("Configured runtime handled the support question.")
    ).toBeInTheDocument()
    expect(screen.queryByText("Answer generation failed")).not.toBeInTheDocument()
    expect(screen.getByText("Source: Product documentation sample")).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
