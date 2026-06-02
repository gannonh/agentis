import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router"
import { AgentDetailPage } from "./agent-detail"
import { ApiError } from "@/lib/api/client"
import {
  getAgent,
  startAgentTestThread,
  updateAgent,
} from "@/lib/api/agents-client"
import { useIntegrations } from "@/hooks/use-integrations"
import type { AgentDetailResponse, IntegrationToolkit } from "@workspace/shared"

vi.mock("@/lib/api/agents-client", () => ({
  getAgent: vi.fn(),
  startAgentTestThread: vi.fn(),
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

type AgentRecentThreadSummary =
  AgentDetailResponse["information"]["recentThreads"][number]
type AgentLibraryItemSummary =
  AgentDetailResponse["information"]["library"]["items"][number]

type ApiAgentDetailOptions = {
  agent?: Partial<AgentDetailResponse["agent"]>
  toolGrants?: AgentDetailResponse["toolGrants"]
  information?: AgentDetailResponse["information"]
}

function apiThreadSummary(
  overrides: Partial<AgentRecentThreadSummary> = {}
): AgentRecentThreadSummary {
  const now = new Date().toISOString()
  return {
    id: "thread_recent",
    title: "Test Created Research Agent",
    status: "active",
    model: "gpt-4o-mini",
    agentConfigurationVersionId: "version_created",
    createdAt: now,
    updatedAt: now,
    lastRunStatus: "completed",
    documentCount: 1,
    ...overrides,
  }
}

function apiDocumentSummary(
  overrides: Partial<AgentLibraryItemSummary> = {}
): AgentLibraryItemSummary {
  const now = new Date().toISOString()
  return {
    id: "document_notes",
    title: "Research notes",
    description: null,
    documentType: "markdown",
    mimeType: "text/markdown",
    sizeBytes: 42,
    previewText: "Summary",
    metadata: null,
    projectId: null,
    projectNameSnapshot: null,
    threadId: "thread_recent",
    threadTitleSnapshot: "Test Created Research Agent",
    runId: "run_recent",
    agentId: "agent_created",
    agentNameSnapshot: "Created Research Agent",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function apiAgentDetail({
  agent: overrides = {},
  toolGrants,
  information,
}: ApiAgentDetailOptions = {}): AgentDetailResponse {
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
      nativeTools: ["webSearch"],
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
    information: information ?? {
      recentThreads: [],
      library: { items: [], totalCount: 0 },
    },
  }
}

describe("AgentDetailPage", () => {
  beforeEach(() => {
    vi.mocked(getAgent).mockReset()
    vi.mocked(startAgentTestThread).mockReset()
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
      screen.getByRole("heading", { name: "Loading agent details" })
    ).toBeInTheDocument()
    expect(screen.getByText("Getting this agent ready.")).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Agent not found" })
    ).not.toBeInTheDocument()
  })

  it("shows an API-backed agent detail for created agents", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({
        agent: {
          sourceThread: {
            id: "thread_source",
            title: "Investigate support backlog",
          },
        },
      })
    )

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
    expect(screen.getAllByText("google-drive").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Source thread")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Investigate support backlog" })
    ).toHaveAttribute("href", "/threads/thread_source")
  })

  it("renders API-backed overview and activity information", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({
        information: {
          recentThreads: [apiThreadSummary()],
          library: { items: [], totalCount: 0 },
        },
      })
    )

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Configured tools" })
    ).toBeInTheDocument()
    expect(screen.getByText("Test Created Research Agent")).toBeInTheDocument()
    expect(screen.getByText(/Latest run: completed/)).toBeInTheDocument()
    expect(screen.getByText(/1 document available/)).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Activity" }))
    expect(
      screen.getByRole("searchbox", { name: "Search threads" })
    ).toBeInTheDocument()
    expect(screen.getByText("Test Created Research Agent")).toBeInTheDocument()
    expect(
      screen.getByText("1 document available from this thread.")
    ).toBeInTheDocument()
    expect(
      screen.queryByText("AI Automation Consulting Lead Strategy")
    ).not.toBeInTheDocument()
  })

  it("renders API-backed overview and activity empty states", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({
        agent: { toolGrantCount: 0 },
        toolGrants: [],
        information: {
          recentThreads: [],
          library: { items: [], totalCount: 0 },
        },
      })
    )

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/No tools configured yet/)
    ).toBeInTheDocument()
    expect(screen.queryByText("Source thread")).not.toBeInTheDocument()
    expect(screen.getByText(/No threads yet/)).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "Activity" }))
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument()
  })

  it("renders API-backed library documents inside Knowledge", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({
        information: {
          recentThreads: [],
          library: {
            totalCount: 1,
            items: [apiDocumentSummary()],
          },
        },
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
    expect(
      screen.queryByRole("tab", { name: "Library" })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Knowledge" }))

    expect(
      screen.getByRole("heading", { name: "Memories" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Context files" })
    ).toBeInTheDocument()
    expect(screen.getByText("1 item")).toBeInTheDocument()
    expect(screen.getByText("Research notes")).toBeInTheDocument()
    expect(screen.getByText("markdown · text/markdown")).toBeInTheDocument()
    expect(
      screen.getByText("From Test Created Research Agent")
    ).toBeInTheDocument()
  })

  it("opens the Knowledge placeholder from inspector actions", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({
        information: {
          recentThreads: [],
          library: {
            totalCount: 1,
            items: [apiDocumentSummary()],
          },
        },
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

    await user.click(screen.getByRole("button", { name: "Configure memory" }))
    expect(screen.getByRole("tab", { name: "Knowledge" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(
      screen.getByText("Add one to give this agent persistent context.")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "No context files added yet. Attach reference files when this capability is available."
      )
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Configure library" }))
    expect(screen.getByText("Research notes")).toBeInTheDocument()
    expect(screen.getByText("markdown · text/markdown")).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      /AI Automation Consulting Lead Strategy|fixture|mock/i
    )
  })

  it("keeps agent detail focused on persistent agent actions", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/agents/agent_created",
            state: { createdFromThread: true },
          },
        ]}
      >
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    expect(
      screen.queryByText(
        "Agent created from thread. Review settings or start a test thread."
      )
    ).not.toBeInTheDocument()
  })

  it("links new threads to the composer with the agent selected", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    const newThreadAction = screen.getByRole("link", { name: "+ New thread" })

    expect(newThreadAction).toHaveAttribute(
      "href",
      "/threads/new?agentId=agent_created"
    )
    expect(startAgentTestThread).not.toHaveBeenCalled()
  })

  it("saves API-backed identity and prompt edits from the detail tabs", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({
        agent: {
          name: "Updated Research Agent",
          description: "Updated description",
          systemPrompt: "Updated prompt",
        },
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
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({ agent: { toolGrantCount: 0 }, toolGrants: [] })
    )

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: "Overview" }).querySelector("svg")
    ).not.toBeNull()
    expect(
      screen.getByRole("tab", { name: "Knowledge" }).querySelector("svg")
    ).not.toBeNull()
    expect(
      screen.queryByRole("tab", { name: "Library" })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Identity" }))
    expect(screen.getByRole("button", { name: /Claymorphism/ })).toBeDisabled()

    fireEvent.click(screen.getByRole("tab", { name: "Activity" }))
    expect(
      screen.getByRole("searchbox", { name: "Search threads" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Personal" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Shared" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Model" }))
    expect(screen.getByText("Model & Limits")).toBeInTheDocument()
    expect(screen.getByText("Extended thinking")).toBeInTheDocument()
    expect(screen.getByText("Budget limit per query")).toBeInTheDocument()
    expect(screen.getByText("Subagent model")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Invocations" }))
    for (const label of [
      "Live mode",
      "Thread",
      "Slack",
      "Telegram",
      "Scheduled",
      "Webhook",
      "Email",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1)
    }

    fireEvent.click(screen.getByRole("tab", { name: "Tools" }))
    expect(screen.getByText("Integrations")).toBeInTheDocument()
    expect(screen.getByText("0 active")).toBeInTheDocument()
    expect(screen.getByText(/No integrations added yet/)).toBeInTheDocument()
    expect(screen.getByText("Execution")).toBeInTheDocument()
    expect(screen.getByText("Research")).toBeInTheDocument()
    expect(screen.getByText("Full VM")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Knowledge" }))
    expect(
      screen.getByRole("heading", { name: "Knowledge discovery" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Memories" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Context files" })
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByText("0 items")).toBeInTheDocument()
    expect(screen.getByText("No library documents yet")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Configure tools" }))
    expect(screen.getByRole("tab", { name: "Tools" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByText("Integrations")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Configure skills" }))
    expect(screen.getByRole("tab", { name: "Skills" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Configure memory" }))
    expect(screen.getByRole("tab", { name: "Knowledge" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(
      screen.getByText("Add one to give this agent persistent context.")
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Configure library" }))
    expect(screen.getByRole("tab", { name: "Knowledge" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByText("No library documents yet")).toBeInTheDocument()
  }, 30_000)

  it("shows API save errors on editable model fields", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockRejectedValueOnce(
      new ApiError("Invalid model", 400)
    )

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

    await user.click(
      screen.getByRole("button", { name: "Go to fixture agent" })
    )

    expect(
      await screen.findByRole("heading", { name: "Senior Reviewer" })
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByRole("heading", { name: "Access" })).toBeInTheDocument()
  })

  it("counts both native tools and integration grants in the Tools badge", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Tools" }))

    expect(screen.getByText("2 active")).toBeInTheDocument()
  })

  it("renders catalog-only tools as static cards instead of toggles", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())

    render(
      <MemoryRouter initialEntries={["/agents/agent_created"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Created Research Agent" })
    await user.click(screen.getByRole("tab", { name: "Tools" }))

    expect(screen.getByText("Browser").closest("label")).toBeNull()
    expect(screen.getByRole("checkbox", { name: "Search" })).toBeInTheDocument()
  })

  it("saves API-backed tool grants from the Tools tab", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(apiAgentDetail())
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({ agent: { toolGrantCount: 0 }, toolGrants: [] })
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

    expect(updateAgent).toHaveBeenCalledWith("agent_created", {
      toolGrants: [],
      nativeTools: ["webSearch"],
    })
  })

  it("saves Search as a native tool permission from the Tools tab", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({ agent: { toolGrantCount: 0 }, toolGrants: [] })
    )
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({
        agent: {
          toolGrantCount: 0,
          currentConfigurationVersion: {
            id: "version_created_2",
            agentId: "agent_created",
            version: 2,
            systemPrompt: "Research carefully.",
            model: "gpt-4o-mini",
            maxCostPerRunUsd: null,
            nativeTools: [],
            createdAt: new Date().toISOString(),
          },
        },
        toolGrants: [],
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
    await user.click(screen.getByRole("tab", { name: "Tools" }))
    await user.click(screen.getByRole("checkbox", { name: "Search" }))
    await user.click(screen.getByRole("button", { name: "Save tools" }))

    expect(updateAgent).toHaveBeenCalledWith("agent_created", {
      toolGrants: [],
      nativeTools: [],
    })
  })

  it("adds connected tools to an existing API-backed agent from the Tools tab", async () => {
    const user = userEvent.setup()
    mockIntegrations([connectedToolkit("slack", "Slack")])
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({ agent: { toolGrantCount: 0 }, toolGrants: [] })
    )
    vi.mocked(updateAgent).mockResolvedValueOnce(
      apiAgentDetail({
        agent: { toolGrantCount: 1 },
        toolGrants: [
          {
            id: "grant_slack",
            scopeType: "agent",
            scopeId: "agent_created",
            toolkitSlug: "slack",
            connectionId: "conn_slack",
            createdAt: new Date().toISOString(),
          },
        ],
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
    await user.click(screen.getByRole("tab", { name: "Tools" }))
    await user.click(screen.getByRole("checkbox", { name: /Slack/ }))
    await user.click(screen.getByRole("button", { name: "Save tools" }))

    expect(updateAgent).toHaveBeenCalledWith("agent_created", {
      toolGrants: [{ toolkitSlug: "slack" }],
      nativeTools: ["webSearch"],
    })
    expect(await screen.findByText("Tools saved")).toBeInTheDocument()
  })

  it("shows a useful empty description for API-backed agents", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce(
      apiAgentDetail({
        agent: {
          id: "agent_blank",
          name: "Blank Description Agent",
          description: null,
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
        toolGrants: [],
      })
    )

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
      screen.getByText(
        "We couldn't load this agent. Try again or return to Command Center."
      )
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
