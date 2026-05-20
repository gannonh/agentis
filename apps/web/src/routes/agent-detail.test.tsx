import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { AgentDetailPage } from "./agent-detail"

describe("AgentDetailPage", () => {
  it("shows senior reviewer description", () => {
    render(
      <MemoryRouter initialEntries={["/agents/senior-reviewer"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByRole("heading", { name: "Senior Reviewer" })).toBeInTheDocument()
    expect(
      screen.getByText(/staff-level code reviewer/i)
    ).toBeInTheDocument()
    expect(screen.getByText("Claude Opus 4.6")).toBeInTheDocument()
  })
})
