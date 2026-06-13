import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import { createThread } from "@/lib/api/client"
import { NewThreadPage } from "./new-thread"

const navigate = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("@/lib/api/use-runtime-health", () => ({
  useRuntimeHealth: () => ({
    health: { available: true, model: "gpt-4o-mini" },
    loading: false,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/lib/api/client", () => ({
  createThread: vi.fn().mockResolvedValue({
    thread: { id: "thread_test" },
    run: { id: "run_test" },
  }),
  listThreads: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/hooks/use-agents", () => ({
  useAgents: () => ({
    agents: [
      {
        id: "agent_research",
        name: "Research Agent",
        description: "Answers with citations.",
        model: "gpt-4o-mini",
        toolGrantCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceWorkflow: {
          summary: "Research",
          firstUserPrompt: "Summarize the latest research notes.",
        },
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({
    projects: [{ id: "project_test", name: "Launch", status: "active" }],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-integrations", () => ({
  useIntegrations: () => ({
    toolkits: [
      {
        slug: "github",
        name: "GitHub",
        description: "Manage repos.",
        category: "developer",
        featured: true,
        status: "connected",
        connectedAccountCount: 1,
        availableTools: [],
      },
    ],
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
  }),
}))

describe("NewThreadPage", () => {
  beforeEach(() => {
    navigate.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("navigates to thread detail after submit", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText("What's the task?")
    await user.type(input, "Plan my week")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(createThread).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: GENERIC_AGENTIS_AGENT_ID })
      )
      expect(navigate).toHaveBeenCalledWith("/threads/thread_test", {
        state: { startRunId: "run_test" },
      })
    })
  })

  it("preselects an agent from the URL", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/threads/new?agentId=agent_research"]}>
        <NewThreadPage />
      </MemoryRouter>
    )

    expect(
      screen.getAllByRole("button", { name: /research agent/i }).length
    ).toBeGreaterThan(0)

    const input = screen.getByPlaceholderText("What's the task?")
    await user.type(input, "Read the research notes")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(createThread).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: "agent_research" })
      )
    })
  })

  it("normalizes an unknown URL agent to the default before submit", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/threads/new?agentId=agent_missing"]}>
        <NewThreadPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("button", { name: /agentis/i })).toBeInTheDocument()
    const input = screen.getByPlaceholderText("What's the task?")
    await user.type(input, "Plan with the default agent")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(createThread).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: GENERIC_AGENTIS_AGENT_ID })
      )
    })
  })

  it("shows tools picker for the generic agent and sends selected grants", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    await user.click(screen.getByRole("button", { name: "Tools" }))
    await user.click(await screen.findByRole("menuitem", { name: /GitHub/i }))

    expect(screen.getByText(/GitHub enabled/i)).toBeInTheDocument()

    const input = screen.getByPlaceholderText("What's the task?")
    await user.type(input, "List my GitHub repositories")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(createThread).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: GENERIC_AGENTIS_AGENT_ID,
          toolGrants: [{ toolkitSlug: "github" }],
        })
      )
    })
  })

  it("submits the selected API-backed agent", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    await user.click(screen.getByRole("button", { name: /agentis/i }))
    await user.click(await screen.findByRole("menuitem", { name: /research agent/i }))
    const input = screen.getByPlaceholderText("What's the task?")
    await user.type(input, "Read the research notes")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(createThread).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: "agent_research" })
      )
    })
  })

  it("clears an agent chip selection when a static chip is selected", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    const agentChip = screen
      .getAllByRole("button", { name: /research agent/i })
      .find((button) => button.getAttribute("aria-haspopup") !== "menu")
    expect(agentChip).toBeDefined()
    if (!agentChip) throw new Error("Expected an agent suggestion chip")

    await user.click(agentChip)
    await user.click(screen.getByRole("button", { name: /research a topic/i }))
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(createThread).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: GENERIC_AGENTIS_AGENT_ID })
      )
    })
  })
})
