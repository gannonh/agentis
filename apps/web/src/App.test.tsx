import { render, screen } from "@testing-library/react"
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
})
