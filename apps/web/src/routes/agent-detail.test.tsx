import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { AgentDetailPage } from "./agent-detail"
import { ApiError } from "@/lib/api/client"
import { getAgent, updateAgent } from "@/lib/api/agents-client"
import type { AgentDetailResponse } from "@workspace/shared"

vi.mock("@/lib/api/agents-client", () => ({
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
}))

function apiAgentDetail(overrides: Partial<AgentDetailResponse["agent"]> = {}): AgentDetailResponse {
  const now = new Date().toISOString()
  const agent = {
    id: "agent_created",
    name: "Created Research Agent",
    description: "Created through the API",
    systemPrompt: "Research carefully.",
    model: "gpt-4o-mini",
    maxCostPerRunUsd: null,
    createdAt: now,
    updatedAt: now,
    currentConfigurationVersion: {
      id: "version_created",
      agentId: "agent_created",
      version: 1,
      systemPrompt: "Research carefully.",
      model: "gpt-4o-mini",
      maxCostPerRunUsd: null,
      createdAt: now,
    },
    toolGrantCount: 1,
    ...overrides,
  }

  return {
    agent,
    configurationVersions: [agent.currentConfigurationVersion],
    toolGrants: [
      {
        id: "grant_created",
        scopeType: "agent",
        scopeId: agent.id,
        toolkitSlug: "google-drive",
        connectionId: "conn_google_drive",
        createdAt: now,
      },
    ],
  }
}

describe("AgentDetailPage", () => {
  beforeEach(() => {
    vi.mocked(getAgent).mockReset()
    vi.mocked(updateAgent).mockReset()
  })

  it("shows senior reviewer aligned with agent detail comp", () => {
    render(
      <MemoryRouter initialEntries={["/agents/senior-reviewer"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: "Senior Reviewer" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" })
    ).toHaveTextContent("Agents")
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" })
    ).toHaveTextContent("Senior Reviewer")
    expect(
      screen.getAllByText(/staff-level code reviewer/i).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Claude Opus 4.6")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Access" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Connect Slack" })
    ).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getByText("Finished")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Observability" })
    ).toBeInTheDocument()
    expect(screen.getByText(/Invocations \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Tools \(20\)/)).toBeInTheDocument()
    expect(screen.getByText("Exa")).toBeInTheDocument()
  })

  it("shows loading immediately for API-backed agents", () => {
    vi.mocked(getAgent).mockReturnValueOnce(new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: "Loading agent" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Agent not found" })
    ).not.toBeInTheDocument()
  })

  it("shows an API-backed agent detail for created agents", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Created Research Agent" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Agent not found" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument()
    expect(screen.getByText("google-drive")).toBeInTheDocument()
  })

  it("saves API-backed identity and prompt edits from the detail tabs", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({
        name: "Updated Research Agent",
        description: "Updated description",
        systemPrompt: "Updated prompt",
      })
    )

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Identity" }))
    await user.clear(screen.getByLabelText("Name"))
    await user.type(screen.getByLabelText("Name"), "Updated Research Agent")
    await user.clear(screen.getByLabelText("Description"))
    await user.type(screen.getByLabelText("Description"), "Updated description")
    await user.clear(screen.getByLabelText("System prompt"))
    await user.type(screen.getByLabelText("System prompt"), "Updated prompt")
    await user.click(screen.getByRole("button", { name: "Save identity" }))

    expect(updateAgent).toHaveBeenCalledWith("agent_created", {
      name: "Updated Research Agent",
      description: "Updated description",
      systemPrompt: "Updated prompt",
    })
    expect(
      await screen.findByRole("heading", { name: "Updated Research Agent" })
    ).toBeInTheDocument()
  })

  it("shows API save errors on editable model fields", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockRejectedValueOnce(new ApiError("Invalid model", 400))

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Model" }))
    await user.clear(screen.getByDisplayValue("gpt-4o-mini"))
    await user.click(screen.getByRole("button", { name: "Save model" }))

    expect(await screen.findByText("Invalid model")).toBeInTheDocument()
  })

  it("saves API-backed tool grants from the Tools tab", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({ toolGrantCount: 0 })
    )

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Tools" }))
    await user.click(screen.getByRole("checkbox", { name: "google-drive" }))
    await user.click(screen.getByRole("button", { name: "Save tools" }))

    expect(updateAgent).toHaveBeenCalledWith("agent_created", { toolGrants: [] })
  })

  it("shows a useful empty description for API-backed agents", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce({
      agent: {
        id: "agent_blank",
        name: "Blank Description Agent",
        description: null,
        systemPrompt: "Research carefully.",
        model: "gpt-4o-mini",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentConfigurationVersion: {
          id: "version_blank",
          agentId: "agent_blank",
          version: 1,
          systemPrompt: "Research carefully.",
          model: "gpt-4o-mini",
          createdAt: new Date().toISOString(),
        },
        toolGrantCount: 0,
      },
      configurationVersions: [],
      toolGrants: [],
    })

    render(
      <MemoryRouter initialEntries={["/agents/agent_blank"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Blank Description Agent" })
    ).toBeInTheDocument()
    expect(
      screen.getAllByText("No description yet").length
    ).toBeGreaterThanOrEqual(1)
  })

  it("shows not found for unknown agent id", async () => {
    vi.mocked(getAgent).mockRejectedValueOnce(
      new ApiError("Agent not found", 404)
    )

    render(
      <MemoryRouter initialEntries={["/agents/unknown-agent"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Agent not found" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Command Center" })
    ).toHaveAttribute("href", "/command-center")
  })

  it("shows an API failure state when the agent request fails", async () => {
    vi.mocked(getAgent).mockRejectedValueOnce(
      new ApiError("Server unavailable", 500)
    )

    render(
      <MemoryRouter initialEntries={["/agents/agent_unavailable"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Agent unavailable" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Agent not found" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
  })

  it("shows not found for command-center agent id", () => {
    render(
      <MemoryRouter initialEntries={["/agents/command-center"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: "Agent not found" })
    ).toBeInTheDocument()
  })
})
