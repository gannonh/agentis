import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { NewThreadPage } from "./new-thread"

describe("NewThreadPage", () => {
  it("shows agent picker and composer aligned with new thread comp", () => {
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: "Let's get to work." })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Agentis/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("What's the task?")).toBeInTheDocument()
    expect(screen.getByText(/Connect your integrations/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Recent threads" })).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show all" })).toBeInTheDocument()
  })
})
