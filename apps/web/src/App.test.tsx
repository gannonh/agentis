import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"

import { App } from "./App"
import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
  SupportAgentRuntime,
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
    render(<App />)

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
      })
    )
    expect(
      screen.getByText("Configured runtime handled the support question.")
    ).toBeInTheDocument()
  })

  test("renders submitted user and assistant transcript messages", async () => {
    const user = userEvent.setup()
    render(<App />)

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
    render(<App />)

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

  test("keeps earlier support questions in the transcript", async () => {
    const user = userEvent.setup()
    render(<App />)

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

  test("surfaces support runtime errors and keeps the question available", async () => {
    const user = userEvent.setup()
    const runtimeError = new Error("Runtime unavailable")
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

    expect(
      await screen.findByText("The support agent could not answer right now.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Support question")).toHaveValue(
      "How do I connect a knowledge source?"
    )
    expect(screen.queryByText("Assistant")).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(
      "Support agent response failed",
      runtimeError
    )
    consoleError.mockRestore()
  })
})
