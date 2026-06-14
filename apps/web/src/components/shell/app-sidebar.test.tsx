import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import { AppSidebar } from "./app-sidebar"
import { GlobalSearchProvider } from "@/components/shell/global-search-provider"
import { beforeEach, vi } from "vitest"

const { refreshAgents, useAgentsMock, listThreadsMock, updateThreadMock } =
  vi.hoisted(() => ({
    refreshAgents: vi.fn(),
    useAgentsMock: vi.fn(),
    listThreadsMock: vi.fn(),
    updateThreadMock: vi.fn(),
  }))

function apiAgent() {
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
  }
}

vi.mock("@/lib/api/client", () => ({
  listThreads: listThreadsMock,
  updateThread: updateThreadMock,
}))

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({
    projects: [
      {
        id: "project_demo",
        name: "Product Launch Q4",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-agents", () => ({
  useAgents: useAgentsMock,
}))

function renderSidebar(initialPath = "/threads/new") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TooltipProvider>
        <GlobalSearchProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </GlobalSearchProvider>
      </TooltipProvider>
    </MemoryRouter>
  )
}

describe("AppSidebar", () => {
  beforeEach(() => {
    refreshAgents.mockClear()
    updateThreadMock.mockReset()
    updateThreadMock.mockResolvedValue({})
    listThreadsMock.mockResolvedValue([
      {
        id: "thread_demo",
        title: "Creating Agent",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        projectId: "project_demo",
        starred: false,
        hasPendingApproval: false,
        agentId: GENERIC_AGENTIS_AGENT_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    useAgentsMock.mockReturnValue({
      agents: [apiAgent()],
      loading: false,
      error: null,
      refresh: refreshAgents,
    })
  })

  it("renders primary navigation links", async () => {
    renderSidebar()
    expect(screen.getByText("New thread")).toBeInTheDocument()
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.getByText("Library")).toBeInTheDocument()
    expect(screen.getByText("Learning")).toBeInTheDocument()
    expect(screen.getByText("Integrations")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    })
  })

  it("renders API agents and API thread labels", async () => {
    renderSidebar()
    expect(screen.getByText("Command Center")).toBeInTheDocument()
    expect(screen.getByText("API Research Agent")).toBeInTheDocument()
    expect(screen.queryByText("Senior Reviewer")).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    })
  })

  it("links to the new-agent screen from the agents heading", async () => {
    renderSidebar()
    expect(screen.getByRole("link", { name: "New agent" })).toHaveAttribute(
      "href",
      "/agents/new"
    )
    await waitFor(() => {
      expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    })
  })

  it("refreshes API agents after navigation to a created agent", async () => {
    renderSidebar("/agents/agent_api_research")
    await waitFor(() => {
      expect(refreshAgents).toHaveBeenCalled()
    })
  })

  it("links the demo user account button to debug data seeding", async () => {
    renderSidebar()
    expect(screen.getByRole("link", { name: /Demo User/ })).toHaveAttribute(
      "href",
      "/debug/seeding"
    )
    await waitFor(() => {
      expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    })
  })

  it("does not show referral promo copy", async () => {
    renderSidebar()
    expect(screen.queryByText(/referral/i)).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    })
  })

  it("lists API projects and highlights the active project from the thread", async () => {
    renderSidebar("/threads/thread_demo")
    await waitFor(() => {
      expect(screen.getByText("Product Launch Q4")).toBeInTheDocument()
    })
    expect(screen.queryByText("New project")).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Product Launch Q4" })
    ).toHaveAttribute("href", "/projects/project_demo")
  })

  it("highlights project from new-thread query param", async () => {
    renderSidebar("/threads/new?projectId=project_demo")
    await waitFor(() => {
      expect(screen.getByText("Product Launch Q4")).toBeInTheDocument()
    })
  })

  it("shows loading state for API agents", async () => {
    useAgentsMock.mockReturnValueOnce({
      agents: [],
      loading: true,
      error: null,
      refresh: refreshAgents,
    })
    renderSidebar()
    expect(screen.getByText("Loading agents…")).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getAllByText("Creating Agent").length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it("shows error state for API agents", async () => {
    useAgentsMock.mockReturnValueOnce({
      agents: [],
      loading: false,
      error: "Failed to load agents",
      refresh: refreshAgents,
    })
    renderSidebar()
    expect(screen.getByText("Agents unavailable")).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getAllByText("Creating Agent").length
      ).toBeGreaterThanOrEqual(1)
    })
  })

  it("renders a starred section and waiting badge metadata", async () => {
    listThreadsMock.mockResolvedValue([
      {
        id: "thread_starred",
        title: "Starred thread",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        starred: true,
        hasPendingApproval: true,
        agentNameSnapshot: "Research Agent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "thread_generic",
        title: "Generic thread",
        status: "active",
        model: "gpt-4o-mini",
        mode: "agent",
        starred: false,
        hasPendingApproval: false,
        agentId: GENERIC_AGENTIS_AGENT_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    renderSidebar()

    await waitFor(() => {
      expect(screen.getByText("Starred")).toBeInTheDocument()
      expect(screen.getAllByText("Waiting").length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText("Research Agent").length).toBeGreaterThanOrEqual(
      1
    )
    expect(screen.getAllByText("Agentis").length).toBeGreaterThanOrEqual(1)
  })

  it("toggles star without navigating away", async () => {
    const user = userEvent.setup()
    renderSidebar("/threads/new")

    await waitFor(() => {
      expect(screen.getByLabelText("Star thread")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Star thread"))

    await waitFor(() => {
      expect(updateThreadMock).toHaveBeenCalledWith("thread_demo", {
        starred: true,
      })
    })
  })
})
