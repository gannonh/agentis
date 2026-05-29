import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { AgentPicker } from "./agent-picker"

const apiAgents = [
  {
    id: "agent_research",
    name: "Research Agent",
    description: "Answers with citations.",
    model: "gpt-4o-mini",
    toolGrantCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe("AgentPicker", () => {
  it("lists default, API-backed agents, and create from scratch", () => {
    render(
      <MemoryRouter>
        <AgentPicker
          value="agent_agentis"
          onChange={() => {}}
          agents={apiAgents}
          defaultOpen
        />
      </MemoryRouter>
    )

    expect(screen.getByText("Agentis (default)")).toBeInTheDocument()
    expect(screen.getByText("Your agents")).toBeInTheDocument()
    expect(screen.getByText("Research Agent")).toBeInTheDocument()
    expect(screen.queryByText("Starter agents")).not.toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /Create from scratch/i })
    ).toHaveAttribute("href", "/agents/new")
  })
})
