import { vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { CommandCenterPage } from "./command-center"

vi.mock("@/hooks/use-agents", () => ({
  useAgents: () => ({
    agents: [
      {
        id: "agent_api_research",
        name: "API Research Agent",
        description: "Created through the API",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentConfigurationVersion: {
          id: "agent_version_api_research",
          agentId: "agent_api_research",
          version: 1,
          systemPrompt: "Answer with citations.",
          model: "gpt-4o-mini",
          createdAt: new Date().toISOString(),
        },
        toolGrantCount: 1,
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

describe("CommandCenterPage", () => {
  it("shows command center metrics from fixtures and agent roster from API agents", async () => {
    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("heading", { name: "Command Center" })
    ).toBeInTheDocument()
    expect(screen.getByText("Agents")).toBeInTheDocument()
    expect(screen.getByText("Total runs")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Agent roster" })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "API Research Agent" })).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("link", { name: "Senior Reviewer" })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Needs attention" })).toBeInTheDocument()
    expect(screen.getByText("1 pending improvement")).toBeInTheDocument()
    expect(screen.getByText("New Rubric")).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
  })
})
