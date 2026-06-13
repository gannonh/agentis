import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import type {
  AgentDetailResponse,
  AgentUsageResponse,
  IntegrationToolkit,
} from "@workspace/shared"
import { AgentCreatePage } from "./agent-create"
import { AgentDetailPage } from "./agent-detail"
import { CommandCenterPage } from "./command-center"
import {
  createAgent,
  getAgent,
  getAgentUsage,
  startAgentTestThread,
} from "@/lib/api/agents-client"
import { useAgents } from "@/hooks/use-agents"

vi.mock("@/hooks/use-integrations", () => ({
  useIntegrations: () => ({
    toolkits: [connectedToolkit()],
    categories: ["Developer tools"],
    query: "",
    category: null,
    setQuery: vi.fn(),
    setCategory: vi.fn(),
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

vi.mock("@/hooks/use-agents", () => ({
  useAgents: vi.fn(),
}))

vi.mock("@/lib/api/agents-client", () => ({
  createAgent: vi.fn(),
  getAgent: vi.fn(),
  getAgentUsage: vi.fn(),
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
    integrationType: "native",
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

function emptyUsage(agentId: string): AgentUsageResponse {
  return {
    agentId,
    periodDays: 30,
    totalCostUsd: 0,
    totalRuns: 0,
    daily: [],
    byModel: [],
  }
}

function visibleText(container: HTMLElement): string {
  const textNodes = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const chunks: string[] = []

  while (textNodes.nextNode()) {
    const node = textNodes.currentNode
    const parent = node.parentElement
    const text = node.textContent?.trim()

    if (!parent || !text || isHidden(parent)) continue
    chunks.push(text)
  }

  return chunks.join(" ")
}

function isHidden(element: HTMLElement): boolean {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    if (current.hidden || current.getAttribute("aria-hidden") === "true") return true

    const style = getComputedStyle(current)
    if (style.display === "none" || style.visibility === "hidden") return true
  }

  return false
}

function renderAcceptancePath() {
  return render(
    <MemoryRouter initialEntries={["/agents/new"]}>
      <Routes>
        <Route path="/agents/new" element={<AgentCreatePage />} />
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        <Route path="/command-center" element={<CommandCenterPage />} />
        <Route path="/threads/new" element={<div>New thread composer</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("agent create-to-test acceptance path", () => {
  beforeEach(() => {
    const detail = agentDetail()
    vi.mocked(createAgent).mockResolvedValue(detail)
    vi.mocked(getAgent).mockResolvedValue(detail)
    vi.mocked(getAgentUsage).mockResolvedValue(emptyUsage(detail.agent.id))
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
    expect(visibleText(container)).not.toMatch(
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
    const newThreadAction = await screen.findByRole("link", { name: "+ New thread" })

    expect(newThreadAction).toHaveAttribute(
      "href",
      "/threads/new?agentId=agent_acceptance"
    )

    await user.click(newThreadAction)

    expect(startAgentTestThread).not.toHaveBeenCalled()
    expect(await screen.findByText("New thread composer")).toBeInTheDocument()
  }, 20_000)
})
