import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { AgentDetailPage } from "./agent-detail"
import { getAgent } from "@/lib/api/agents-client"

vi.mock("@/lib/api/agents-client", () => ({
  getAgent: vi.fn(),
}))

describe("AgentDetailPage", () => {
  beforeEach(() => {
    vi.mocked(getAgent).mockReset()
  })

  it("shows senior reviewer aligned with agent detail comp", () => {
    render(
      <MemoryRouter initialEntries={["/agents/senior-reviewer"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Senior Reviewer" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Agents"
    )
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Senior Reviewer"
    )
    expect(screen.getAllByText(/staff-level code reviewer/i).length).toBeGreaterThanOrEqual(
      1
    )
    expect(screen.getByText("Claude Opus 4.6")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Access" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Connect Slack" })).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getByText("Finished")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Observability" })).toBeInTheDocument()
    expect(screen.getByText(/Invocations \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Tools \(20\)/)).toBeInTheDocument()
    expect(screen.getByText("Exa")).toBeInTheDocument()
  })

  it("shows an API-backed agent detail for created agents", async () => {
    vi.mocked(getAgent).mockResolvedValueOnce({
      agent: {
        id: "agent_created",
        name: "Created Research Agent",
        description: "Created through the API",
        systemPrompt: "Research carefully.",
        model: "gpt-4o-mini",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentConfigurationVersion: {
          id: "version_created",
          agentId: "agent_created",
          version: 1,
          systemPrompt: "Research carefully.",
          model: "gpt-4o-mini",
          createdAt: new Date().toISOString(),
        },
        toolGrantCount: 1,
      },
      configurationVersions: [],
      toolGrants: [
        {
          id: "grant_created",
          scopeType: "agent",
          scopeId: "agent_created",
          toolkitSlug: "google-drive",
          connectionId: "conn_google_drive",
          createdAt: new Date().toISOString(),
        },
      ],
    })

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
    expect(screen.queryByRole("heading", { name: "Agent not found" })).not.toBeInTheDocument()
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument()
    expect(screen.getByText("google-drive")).toBeInTheDocument()
  })

  it("shows not found for unknown agent id", async () => {
    vi.mocked(getAgent).mockRejectedValueOnce(new Error("Agent not found"))

    render(
      <MemoryRouter initialEntries={["/agents/unknown-agent"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole("heading", { name: "Agent not found" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Command Center" })).toHaveAttribute(
      "href",
      "/command-center"
    )
  })

  it("shows not found for command-center agent id", () => {
    render(
      <MemoryRouter initialEntries={["/agents/command-center"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Agent not found" })).toBeInTheDocument()
  })
})
