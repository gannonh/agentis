import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import type { AgentDetailResponse, IntegrationToolkit } from "@workspace/shared"
import { AgentCreatePage } from "./agent-create"
import { AgentDetailPage } from "./agent-detail"
import { CommandCenterPage } from "./command-center"
import { createAgent, getAgent, startAgentTestThread } from "@/lib/api/agents-client"
import { useAgents } from "@/hooks/use-agents"

vi.mock("@/hooks/use-integrations", () => ({
  useIntegrations: () => ({
    toolkits: [connectedToolkit()],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-agents", () => ({
  useAgents: vi.fn(),
}))

vi.mock("@/lib/api/agents-client", () => ({
  createAgent: vi.fn(),
  getAgent: vi.fn(),
  startAgentTestThread: vi.fn(),
  updateAgent: vi.fn(),
}))

function connectedToolkit(): IntegrationToolkit {
  return {
    slug: "github",
    name: "GitHub",
    description: "Source control",
    category: "Developer tools",
    featured: true,
    status: "connected",
    connectedAccountCount: 1,
    availableTools: ["issues"],
  }
}

function agentDetail(): AgentDetailResponse {
  const now = new Date().toISOString()
  return {
    agent: {
      id: "agent_acceptance",
      name: "Research Helper",
      description: "Finds source-backed answers",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
      createdAt: now,
      updatedAt: now,
      currentConfigurationVersion: {
        id: "agent_version_acceptance",
        agentId: "agent_acceptance",
        version: 1,
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        createdAt: now,
      },
      toolGrantCount: 1,
    },
    configurationVersions: [],
    toolGrants: [
      {
        id: "grant_acceptance",
        agentId: "agent_acceptance",
        toolkitSlug: "github",
        connectionId: null,
        createdAt: now,
      },
    ],
    information: {
      recentThreads: [],
      library: { items: [], totalCount: 0 },
    },
  }
}

function renderAcceptancePath() {
  return render(
    <MemoryRouter initialEntries={["/agents/new"]}>
      <Routes>
        <Route path="/agents/new" element={<AgentCreatePage />} />
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        <Route path="/command-center" element={<CommandCenterPage />} />
        <Route path="/threads/:threadId" element={<div>Test chat opened</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("agent create-to-test acceptance path", () => {
  beforeEach(() => {
    const detail = agentDetail()
    vi.mocked(createAgent).mockResolvedValue(detail)
    vi.mocked(getAgent).mockResolvedValue(detail)
    vi.mocked(startAgentTestThread).mockResolvedValue({
      thread: {
        id: "thread_acceptance",
        title: "Try Research Helper",
        status: "active",
        model: "gpt-4o-mini",
        mode: "agent",
        agentId: detail.agent.id,
        agentNameSnapshot: detail.agent.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: {
        id: "msg_acceptance",
        threadId: "thread_acceptance",
        role: "user",
        parts: [{ type: "text", text: "Try Research Helper" }],
        status: "completed",
        createdAt: new Date().toISOString(),
      },
      run: {
        id: "run_acceptance",
        threadId: "thread_acceptance",
        status: "queued",
        model: "gpt-4o-mini",
        agentId: detail.agent.id,
        agentConfigurationVersionId: detail.agent.currentConfigurationVersion.id,
        startedAt: new Date().toISOString(),
      },
    })
    vi.mocked(useAgents).mockReturnValue({
      agents: [detail.agent],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
  })

  it("lets a non-technical user create, find, and try an agent", async () => {
    const user = userEvent.setup()
    const { container } = renderAcceptancePath()

    expect(screen.getByText(/Set up a reusable agent by naming it/i)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(
      /\b(runtime|integration|integrations|API|contract|system prompt|runs|grants|toolkits|scoped|payload)\b/i
    )

    await user.type(screen.getByLabelText(/^name/i), "Research Helper")
    await user.type(screen.getByLabelText(/^instructions/i), "Answer with citations.")
    await user.click(screen.getByRole("checkbox", { name: /GitHub/ }))
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    expect(await screen.findByRole("heading", { name: "Research Helper" })).toBeInTheDocument()
    expect(createAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Research Helper",
        systemPrompt: "Answer with citations.",
        toolGrants: [{ toolkitSlug: "github" }],
      })
    )

    await user.click(screen.getByRole("link", { name: "Agents" }))
    expect(await screen.findByRole("link", { name: "Research Helper" })).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Research Helper" }))
    await user.click(await screen.findByRole("button", { name: "Try this agent" }))

    await waitFor(() => {
      expect(startAgentTestThread).toHaveBeenCalledWith("agent_acceptance", {
        prompt: "Try Research Helper",
      })
    })
    expect(await screen.findByText("Test chat opened")).toBeInTheDocument()
  }, 10_000)
})
