import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"

import { App } from "./App"

describe("App", () => {
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

  test("submits a support question through the Agentis chat path", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole("button", { name: "Product documentation sample" })
    )
    await user.type(
      screen.getByLabelText("Support question"),
      "How do I connect a knowledge source?"
    )
    await user.click(screen.getByRole("button", { name: "Ask support agent" }))

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

    await user.click(
      screen.getByRole("button", { name: "Product documentation sample" })
    )
    await user.type(
      screen.getByLabelText("Support question"),
      "How do I connect a knowledge source?"
    )
    await user.click(screen.getByRole("button", { name: "Ask support agent" }))

    expect(screen.getByText("User")).toBeInTheDocument()
    expect(
      screen.getByText("How do I connect a knowledge source?")
    ).toBeInTheDocument()
    expect(screen.getByText("Assistant")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Open the support template and select Product documentation sample."
      )
    ).toBeInTheDocument()
  })

  test("renders cited source metadata for assistant answers", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole("button", { name: "Product documentation sample" })
    )
    await user.type(
      screen.getByLabelText("Support question"),
      "How do I connect a knowledge source?"
    )
    await user.click(screen.getByRole("button", { name: "Ask support agent" }))

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
})
