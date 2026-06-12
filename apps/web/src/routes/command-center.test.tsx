import { beforeEach, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { CommandCenterPage } from "./command-center"

const { dismissLearningSuggestionMock, useAgentsMock, useCommandCenterMock } =
  vi.hoisted(() => ({
    dismissLearningSuggestionMock: vi.fn(),
    useAgentsMock: vi.fn(),
    useCommandCenterMock: vi.fn(),
  }))

function apiAgent(overrides = {}) {
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
    ...overrides,
  }
}

vi.mock("@/hooks/use-agents", () => ({
  useAgents: useAgentsMock,
}))

vi.mock("@/hooks/use-command-center", () => ({
  useCommandCenter: useCommandCenterMock,
}))

vi.mock("@/lib/api/learning-client", () => ({
  dismissLearningSuggestion: dismissLearningSuggestionMock,
}))

describe("CommandCenterPage", () => {
  beforeEach(() => {
    dismissLearningSuggestionMock.mockResolvedValue({})
    useAgentsMock.mockReturnValue({
      agents: [apiAgent()],
      loading: false,
      error: null,
      refresh: vi.fn(),
    })
    useCommandCenterMock.mockReturnValue({
      data: {
        summary: {
          agentCount: 1,
          activeRuns: 0,
          totalRuns: 2,
          totalCostUsd: 0.88,
          avgScore: 86,
          evaluatedRunCount: 2,
        },
        roster: [
          {
            agentId: "agent_api_research",
            runCount: 2,
            totalCostUsd: 0.88,
            lastRunAt: "2026-06-09T12:00:00.000Z",
            activeRunCount: 0,
            avgScore: 86,
            evaluatedRunCount: 2,
          },
        ],
        recentRuns: [
          {
            id: "run_1",
            threadId: "thread_1",
            agentId: "agent_api_research",
            title: "Live run",
            status: "completed",
            costUsd: 0.44,
            startedAt: "2026-06-09T12:00:00.000Z",
            evaluationScore: 86,
          },
        ],
        needsAttention: {
          totalCount: 1,
          items: [
            {
              id: "attention_learning_suggestion_1",
              type: "pending_learning_suggestion",
              title: "Remember citation preference",
              description: "User prefers source-backed answers.",
              tag: "Pending memory",
              severity: "warning",
              createdAt: "2026-06-09T12:05:00.000Z",
              href: "/learning?status=pending&suggestionId=suggestion_1",
              dismissible: true,
              agentId: "agent_api_research",
              threadId: "thread_1",
              suggestionId: "suggestion_1",
            },
          ],
        },
      },
      loading: false,
      error: null,
      sectionErrors: {},
      refresh: vi.fn(),
    })
  })

  it("renders API-backed fleet metrics and roster rows", async () => {
    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("heading", { name: "Command Center" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("note", { name: "Demo data notice" })
    ).toHaveTextContent(
      "Score trends and cost breakdown by model use seeded workspace data until their live chart APIs ship."
    )
    expect(screen.getByText("Agents")).toBeInTheDocument()
    expect(screen.getByText("Active runs")).toBeInTheDocument()
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Total runs")).toBeInTheDocument()
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("$0.88").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Avg score")).toBeInTheDocument()
    expect(screen.getAllByText("86%").length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole("heading", { name: "Agent roster" })
    ).toBeInTheDocument()
    expect(screen.getByText("1 agent")).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "API Research Agent" })
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("link", { name: "Senior Reviewer" })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Live run/ })).toHaveAttribute(
      "href",
      "/threads/thread_1"
    )
    expect(
      screen.getByRole("heading", { name: "Needs attention" })
    ).toBeInTheDocument()
    expect(screen.getByText("1 item needs review")).toBeInTheDocument()
    expect(screen.getByText("Remember citation preference")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      "/learning?status=pending&suggestionId=suggestion_1"
    )
    expect(screen.queryByText("Creating Agent")).not.toBeInTheDocument()
    expect(screen.queryByText("New Rubric")).not.toBeInTheDocument()
  })

  it("shows dismiss errors without clearing the needs-attention panel", async () => {
    dismissLearningSuggestionMock.mockRejectedValueOnce(
      new Error("Suggestion already resolved")
    )
    const refresh = vi.fn()
    useCommandCenterMock.mockReturnValue({
      data: {
        summary: {
          agentCount: 1,
          activeRuns: 0,
          totalRuns: 0,
          totalCostUsd: 0,
          avgScore: null,
          evaluatedRunCount: 0,
        },
        roster: [],
        recentRuns: [],
        needsAttention: {
          totalCount: 1,
          items: [
            {
              id: "attention_learning_suggestion_1",
              type: "pending_learning_suggestion",
              title: "Remember citation preference",
              description: "User prefers source-backed answers.",
              tag: "Pending memory",
              severity: "warning",
              createdAt: "2026-06-09T12:05:00.000Z",
              href: "/learning?status=pending&suggestionId=suggestion_1",
              dismissible: true,
              suggestionId: "suggestion_1",
            },
          ],
        },
      },
      loading: false,
      error: null,
      sectionErrors: {},
      refresh,
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    await waitFor(() => {
      expect(screen.getByText("Suggestion already resolved")).toBeInTheDocument()
      expect(screen.getByText("Remember citation preference")).toBeInTheDocument()
      expect(refresh).not.toHaveBeenCalled()
    })
  })

  it("dismisses pending learning suggestions from the needs-attention panel", async () => {
    const refresh = vi.fn()
    useCommandCenterMock.mockReturnValue({
      data: {
        summary: {
          agentCount: 1,
          activeRuns: 0,
          totalRuns: 0,
          totalCostUsd: 0,
          avgScore: null,
          evaluatedRunCount: 0,
        },
        roster: [],
        recentRuns: [],
        needsAttention: {
          totalCount: 1,
          items: [
            {
              id: "attention_learning_suggestion_1",
              type: "pending_learning_suggestion",
              title: "Remember citation preference",
              description: "User prefers source-backed answers.",
              tag: "Pending memory",
              severity: "warning",
              createdAt: "2026-06-09T12:05:00.000Z",
              href: "/learning?status=pending&suggestionId=suggestion_1",
              dismissible: true,
              suggestionId: "suggestion_1",
            },
          ],
        },
      },
      loading: false,
      error: null,
      sectionErrors: {},
      refresh,
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    await waitFor(() => {
      expect(dismissLearningSuggestionMock).toHaveBeenCalledWith("suggestion_1")
      expect(refresh).toHaveBeenCalled()
    })
  })

  it("shows a recoverable error when agents fail to load", () => {
    const refresh = vi.fn()
    useAgentsMock.mockReturnValue({
      agents: [],
      loading: false,
      error: "Failed to load agents",
      refresh,
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Agent roster unavailable")).toBeInTheDocument()
    expect(screen.getByText("Failed to load agents")).toBeInTheDocument()
    screen.getByRole("button", { name: "Retry loading agents" }).click()
    expect(refresh).toHaveBeenCalled()
  })

  it("shows an empty recent runs state when API returns no runs", () => {
    useCommandCenterMock.mockReturnValue({
      data: {
        summary: {
          agentCount: 1,
          activeRuns: 0,
          totalRuns: 0,
          totalCostUsd: 0,
          avgScore: null,
          evaluatedRunCount: 0,
        },
        roster: [],
        recentRuns: [],
      },
      loading: false,
      error: null,
      sectionErrors: {},
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    expect(screen.getByText("No runs yet")).toBeInTheDocument()
    expect(screen.queryByText("Creating Agent")).not.toBeInTheDocument()
  })

  it("shows a recoverable error when command center metrics fail to load", () => {
    const refresh = vi.fn()
    useCommandCenterMock.mockReturnValue({
      data: null,
      loading: false,
      error: "Failed to load command center metrics",
      sectionErrors: { summary: "Failed to load command center metrics" },
      refresh,
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText("Command Center metrics unavailable")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Failed to load command center metrics")
    ).toBeInTheDocument()
    screen.getByRole("button", { name: "Retry loading metrics" }).click()
    expect(refresh).toHaveBeenCalled()
  })

  it("shows needs-attention load errors without a zero-item summary", () => {
    useCommandCenterMock.mockReturnValue({
      data: {
        summary: {
          agentCount: 1,
          activeRuns: 0,
          totalRuns: 2,
          totalCostUsd: 0.88,
          avgScore: null,
          evaluatedRunCount: 0,
        },
        roster: [],
        recentRuns: [],
        needsAttention: { items: [], totalCount: 0 },
      },
      loading: false,
      error: null,
      sectionErrors: {
        needsAttention: "Failed to load needs-attention items",
      },
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText("Failed to load needs-attention items")
    ).toBeInTheDocument()
    expect(screen.queryByText("0 items need review")).not.toBeInTheDocument()
  })

  it("shows recent runs error while summary metrics still render", () => {
    useCommandCenterMock.mockReturnValue({
      data: {
        summary: {
          agentCount: 1,
          activeRuns: 0,
          totalRuns: 2,
          totalCostUsd: 0.88,
          avgScore: null,
          evaluatedRunCount: 0,
        },
        roster: [],
        recentRuns: [],
      },
      loading: false,
      error: null,
      sectionErrors: { recentRuns: "Failed to load recent runs" },
      refresh: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Total runs")).toBeInTheDocument()
    expect(screen.getByText("Failed to load recent runs")).toBeInTheDocument()
  })
})
