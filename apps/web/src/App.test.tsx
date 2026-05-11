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
})
