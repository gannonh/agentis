import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router"
import { AgentDetailPage } from "./agent-detail"
import { ApiError } from "@/lib/api/client"
import { getAgent, updateAgent } from "@/lib/api/agents-client"
import { useIntegrations } from "@/hooks/use-integrations"
import type { AgentDetailResponse, IntegrationToolkit } from "@workspace/shared"

vi.mock("@/lib/api/agents-client", () => ({
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
}))

vi.mock("@/hooks/use-integrations", () => ({
  useIntegrations: vi.fn(),
}))

function connectedToolkit(slug: string, name = slug): IntegrationToolkit {
  return {
    slug,
    name,
    description: `${name} integration`,
    category: "developer",
    featured: true,
    status: "connected",
    connectedAccountCount: 1,
    availableTools: [`${slug.toUpperCase()}_TOOL`],
  }
}

function mockIntegrations(toolkits: IntegrationToolkit[] = []) {
  vi.mocked(useIntegrations).mockReturnValue({
    toolkits,
    composioConfigured: true,
    composioMockEnabled: false,
    loading: false,
    error: null,
    notice: null,
    setNotice: vi.fn(),
    refresh: vi.fn(),
    connect: vi.fn(),
    refreshStatuses: vi.fn(),
    resetConnection: vi.fn(),
  })
}

function NavigableAgentDetailPage() {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" onClick={() => navigate("/agents/senior-reviewer")}>
        Go to fixture agent
      </button>
      <Routes>
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
      </Routes>
    </>
  )
}

function apiAgentDetail(
  overrides: Partial<AgentDetailResponse["agent"]> = {},
  toolGrants?: AgentDetailResponse["toolGrants"]
): AgentDetailResponse {
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
    toolGrantCount: toolGrants?.length ?? 1,
    ...overrides,
  }

  return {
    agent,
    configurationVersions: [agent.currentConfigurationVersion],
    toolGrants: toolGrants ?? [
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
    vi.mocked(useIntegrations).mockReset()
    mockIntegrations()
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
      screen.queryByRole("button", { name: "Connect Slack" })
    ).not.toBeInTheDocument()
    expect(screen.getByTestId("personal-access-icon")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Senior Reviewer" }).parentElement
        ?.parentElement
    ).not.toHaveClass("border-x")
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

  it("shows comp-aligned editable agent tabs for API-backed agents", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail({ toolGrantCount: 0 }, []))

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Overview" }).querySelector("svg")).not.toBeNull()
    expect(screen.getByRole("tab", { name: "Knowledge" }).querySelector("svg")).not.toBeNull()

    await user.click(screen.getByRole("tab", { name: "Identity" }))
    expect(screen.getByRole("button", { name: /Claymorphism/ })).toBeDisabled()

    await user.click(screen.getByRole("tab", { name: "Activity" }))
    expect(screen.getByRole("searchbox", { name: "Search threads" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Personal" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Shared" })).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Model" }))
    expect(screen.getByText("Model & Limits")).toBeInTheDocument()
    expect(screen.getByText("Extended thinking")).toBeInTheDocument()
    expect(screen.getByText("Budget limit per query")).toBeInTheDocument()
    expect(screen.getByText("Subagent model")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Invocations" }))
    for (const label of ["Live mode", "Thread", "Slack", "Telegram", "Scheduled", "Webhook", "Email"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1)
    }

    await user.click(screen.getByRole("tab", { name: "Tools" }))
    expect(screen.getByText("Integrations")).toBeInTheDocument()
    expect(screen.getByText("0 active")).toBeInTheDocument()
    expect(screen.getByText(/No integrations added yet/)).toBeInTheDocument()
    expect(screen.getByText("Execution")).toBeInTheDocument()
    expect(screen.getByText("Research")).toBeInTheDocument()
    expect(screen.getByText("Full VM")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Knowledge" }))
    expect(screen.getByText("Knowledge discovery")).toBeInTheDocument()
    expect(screen.getByText("Knowledge access")).toBeInTheDocument()
    expect(screen.getByText("See what Personal learns")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Memories" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Context files" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Configure tools" }))
    expect(screen.getByRole("tab", { name: "Tools" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Integrations")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Configure skills" }))
    expect(screen.getByRole("tab", { name: "Skills" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Configure memory" }))
    expect(screen.getByRole("tab", { name: "Knowledge" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Knowledge discovery")).toBeInTheDocument()
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

  it("sends null instead of non-finite model cost limits", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Model" }))
    fireEvent.change(screen.getByLabelText("Max cost per run USD"), {
      target: { value: "1e999" },
    })
    await user.click(screen.getByRole("button", { name: "Save model" }))

    expect(updateAgent).toHaveBeenCalledWith("agent_created", {
      model: "gpt-4o-mini",
      maxCostPerRunUsd: null,
    })
  })

  it("resets to overview when navigating to a non-editable agent", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <NavigableAgentDetailPage />
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Model" }))
    expect(screen.getByRole("tab", { name: "Model" })).toHaveAttribute(
      "aria-selected",
      "true"
    )

    await user.click(screen.getByRole("button", { name: "Go to fixture agent" }))

    expect(
      await screen.findByRole("heading", { name: "Senior Reviewer" })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByRole("heading", { name: "Access" })).toBeInTheDocument()
  })

  it("saves API-backed tool grants from the Tools tab", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({ toolGrantCount: 0 }, [])
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

  it("adds connected tools to an existing API-backed agent from the Tools tab", async () => {
    const user = userEvent.setup()
    mockIntegrations([connectedToolkit("slack", "Slack")])
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail({ toolGrantCount: 0 }, []))
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail(
        { toolGrantCount: 1 },
        [
          {
            id: "grant_slack",
            scopeType: "agent",
            scopeId: "agent_created",
            toolkitSlug: "slack",
            connectionId: "conn_slack",
            createdAt: new Date().toISOString(),
          },
        ]
      )
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
    await user.click(screen.getByRole("checkbox", { name: /Slack/ }))
    await user.click(screen.getByRole("button", { name: "Save tools" }))

    expect(updateAgent).toHaveBeenCalledWith("agent_created", {
      toolGrants: [{ toolkitSlug: "slack" }],
    })
    expect(await screen.findByText("Tools saved")).toBeInTheDocument()
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
