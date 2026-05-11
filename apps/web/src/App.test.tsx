import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { App } from "./App"

describe("App", () => {
  test("renders the starter screen", () => {
    render(<App />)

    expect(
      screen.getByRole("heading", { name: "Project ready!" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("You may now add components and start building.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Button" })).toBeInTheDocument()
  })
})
