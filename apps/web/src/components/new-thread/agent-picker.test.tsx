import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { AgentPicker } from "./agent-picker"

describe("AgentPicker", () => {
  it("lists default, your agents, starter agents, and create from scratch", () => {
    render(
      <MemoryRouter>
        <AgentPicker value="agentis" onChange={() => {}} defaultOpen />
      </MemoryRouter>
    )

    expect(screen.getByText("Agentis (default)")).toBeInTheDocument()
    expect(screen.getByText("Your agents")).toBeInTheDocument()
    expect(screen.getByText("Starter agents")).toBeInTheDocument()
    expect(screen.getByText("Senior Reviewer")).toBeInTheDocument()
    expect(screen.getByText("Daily Briefing")).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /Create from scratch/i })
    ).toHaveAttribute("href", "/agents/new")
  })
})
