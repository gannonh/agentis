import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"

import { App } from "./App"

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
})
