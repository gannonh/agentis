import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { AgentDetailPage } from "./agent-detail"

describe("AgentDetailPage", () => {
  it("shows senior reviewer aligned with agent detail comp", () => {
    render(
      <MemoryRouter initialEntries={["/agents/senior-reviewer"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Senior Reviewer" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Agents"
    )
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Senior Reviewer"
    )
    expect(screen.getAllByText(/staff-level code reviewer/i).length).toBeGreaterThanOrEqual(
      1
    )
    expect(screen.getByText("Claude Opus 4.6")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Access" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Connect Slack" })).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getByText("Finished")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Observability" })).toBeInTheDocument()
    expect(screen.getByText(/Invocations \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Tools \(20\)/)).toBeInTheDocument()
    expect(screen.getByText("Exa")).toBeInTheDocument()
  })

  it("shows not found for unknown agent id", () => {
    render(
      <MemoryRouter initialEntries={["/agents/unknown-agent"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Agent not found" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Command Center" })).toHaveAttribute(
      "href",
      "/command-center"
    )
  })

  it("shows not found for command-center agent id", () => {
    render(
      <MemoryRouter initialEntries={["/agents/command-center"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Agent not found" })).toBeInTheDocument()
  })
})
