import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { AgentCreatePage } from "./agent-create"
import { createAgent } from "@/lib/api/agents-client"

vi.mock("@/hooks/use-integrations", () => ({
  useIntegrations: () => ({
    toolkits: [
      {
        slug: "github",
        name: "GitHub",
        description: "Source control",
        category: "Developer tools",
        featured: true,
        status: "connected",
        connectedAccountCount: 1,
        availableTools: ["issues"],
      },
      {
        slug: "linear",
        name: "Linear",
        description: "Issue tracking",
        category: "Project management",
        featured: true,
        status: "not_connected",
        connectedAccountCount: 0,
        availableTools: ["issues"],
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

const navigate = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("@/lib/api/agents-client", () => ({
  createAgent: vi.fn().mockResolvedValue({
    agent: {
      id: "agent_test",
      name: "Research Agent",
      description: "Finds source-backed answers",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentConfigurationVersion: {
        id: "agent_version_test",
        agentId: "agent_test",
        version: 1,
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        createdAt: new Date().toISOString(),
      },
      toolGrantCount: 2,
    },
    configurationVersions: [],
    toolGrants: [],
  }),
}))

describe("AgentCreatePage", () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(createAgent).mockClear()
  })

  it("creates an agent with identity, contract, model, and tool grants", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentCreatePage />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/^name/i), "Research Agent")
    await user.type(
      screen.getByLabelText(/^description/i),
      "Finds source-backed answers"
    )
    await user.clear(screen.getByLabelText(/^model/i))
    await user.type(screen.getByLabelText(/^model/i), "gpt-4o-mini")
    expect(
      screen.getByText(/Define how the agent should operate/i)
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Role:/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/^agent contract/i),
      "Answer with citations."
    )
    expect(screen.getByText(/Default model for new runs/i)).toBeInTheDocument()
    expect(screen.getByText("Source control")).toBeInTheDocument()
    expect(screen.getByText(/1 tool · 1 account/)).toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: /GitHub/ }))
    expect(screen.getByText("Selected")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: /Linear/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    await waitFor(() => {
      expect(createAgent).toHaveBeenCalledWith({
        name: "Research Agent",
        description: "Finds source-backed answers",
        model: "gpt-4o-mini",
        systemPrompt: "Answer with citations.",
        toolGrants: [{ toolkitSlug: "github" }],
      })
    })
    expect(navigate).toHaveBeenCalledWith("/agents/agent_test")
  })

  it("shows API errors when creation fails", async () => {
    vi.mocked(createAgent).mockRejectedValueOnce(new Error("Invalid agent payload"))
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentCreatePage />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/^name/i), "Research Agent")
    await user.type(
      screen.getByLabelText(/^agent contract/i),
      "Answer with citations."
    )
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    expect(await screen.findByText("Invalid agent payload")).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
