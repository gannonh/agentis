import { beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { CommandCenterPage } from "./command-center"

const { useAgentsMock } = vi.hoisted(() => ({
  useAgentsMock: vi.fn(),
}))

function apiAgent(overrides = {}) {
  return {
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
    ...overrides,
  }
}

vi.mock("@/hooks/use-agents", () => ({
  useAgents: useAgentsMock,
}))

describe("CommandCenterPage", () => {
  beforeEach(() => {
    useAgentsMock.mockReturnValue({
      agents: [apiAgent()],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
  })

  it("derives fleet metrics from the API-backed roster", async () => {
    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("heading", { name: "Command Center" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("note", { name: "Demo data notice" })
    ).toHaveTextContent(
      "Recent runs, score trends, cost breakdown, and needs-attention items use seeded workspace data. Agent roster is API-backed."
    )
    expect(screen.getByText("Agents")).toBeInTheDocument()
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("3")).not.toBeInTheDocument()
    expect(screen.getByText("Total runs")).toBeInTheDocument()
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole("heading", { name: "Agent roster" })).toBeInTheDocument()
    expect(screen.getByText("1 agent")).toBeInTheDocument()
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

  it("shows a recoverable error when agents fail to load", () => {
    const refresh = vi.fn()
    useAgentsMock.mockReturnValue({
      agents: [],
      loading: false,
      error: "Failed to load agents",
      refresh,
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Agent roster unavailable")).toBeInTheDocument()
    expect(screen.getByText("Failed to load agents")).toBeInTheDocument()
    screen.getByRole("button", { name: "Retry loading agents" }).click()
    expect(refresh).toHaveBeenCalled()
  })
})
