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

  it("creates an agent with plain-language setup copy", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <AgentCreatePage />
      </MemoryRouter>
    )

    expect(
      screen.getByText(/Set up a reusable agent by naming it/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Tell the agent how to help, what to focus on, and which connected apps it can use."
      )
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText("openai/gpt-4o-mini")).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^name/i), "Research Agent")
    await user.type(
      screen.getByLabelText(/^description/i),
      "Finds source-backed answers"
    )
    await user.clear(screen.getByLabelText(/^answer engine/i))
    await user.type(screen.getByLabelText(/^answer engine/i), "openai/gpt-4o-mini")
    expect(screen.getByPlaceholderText(/Main job:/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/^instructions/i),
      "Answer with citations."
    )
    expect(
      screen.getByText(/Default choice for this agent's answers/i)
    ).toBeInTheDocument()
    expect(screen.getByText("Source control")).toBeInTheDocument()
    expect(screen.getByText(/1 action · 1 account/)).toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: /GitHub/ }))
    expect(screen.getByText("Selected")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: /Linear/ })).not.toBeInTheDocument()

    const primaryText = container.textContent ?? ""
    expect(primaryText).not.toMatch(
      /\b(integration|integrations|contract|system prompt|runs|grants|toolkits|scoped|payload)\b/i
    )

    await user.click(screen.getByRole("button", { name: /create agent/i }))

    await waitFor(() => {
      expect(createAgent).toHaveBeenCalledWith({
        name: "Research Agent",
        description: "Finds source-backed answers",
        model: "openai/gpt-4o-mini",
        systemPrompt: "Answer with citations.",
        toolGrants: [{ toolkitSlug: "github" }],
        nativeTools: ["webSearch"],
      })
    })
    expect(navigate).toHaveBeenCalledWith("/agents/agent_test")
  })

  it("creates an agent without Search when the built-in capability is unchecked", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentCreatePage />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/^name/i), "No Search Agent")
    await user.type(
      screen.getByLabelText(/^instructions/i),
      "Answer without web search."
    )
    await user.click(screen.getByRole("checkbox", { name: /Search/ }))
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    await waitFor(() => {
      expect(createAgent).toHaveBeenCalledWith({
        name: "No Search Agent",
        description: undefined,
        model: "openai/gpt-4o-mini",
        systemPrompt: "Answer without web search.",
        toolGrants: [],
        nativeTools: [],
      })
    })
  })

  it("shows creation errors without implementation jargon", async () => {
    vi.mocked(createAgent).mockRejectedValueOnce(
      new Error(
        "We couldn't create this agent. Check the details and try again."
      )
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentCreatePage />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/^name/i), "Research Agent")
    await user.type(
      screen.getByLabelText(/^instructions/i),
      "Answer with citations."
    )
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    expect(
      await screen.findByText(
        "We couldn't create this agent. Check the details and try again."
      )
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
