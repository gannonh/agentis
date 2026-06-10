import type { ComponentProps } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { AgentOverviewTab } from "./agent-overview-tab"
import { getAgentUsage } from "@/lib/api/agents-client"
import { ApiError } from "@/lib/api/client"
import type { AgentUsageResponse } from "@workspace/shared"

vi.mock("@/lib/api/agents-client", () => ({
  getAgentUsage: vi.fn(),
}))

function sampleUsage(
  overrides: Partial<AgentUsageResponse> = {}
): AgentUsageResponse {
  return {
    agentId: "agent_created",
    periodDays: 14,
    totalCostUsd: 5.95,
    totalRuns: 3,
    daily: [
      { date: "2026-06-07", costUsd: 1.2, runCount: 1 },
      { date: "2026-06-08", costUsd: 4.75, runCount: 2 },
    ],
    byModel: [
      {
        model: "claude-opus-4-6",
        costUsd: 5.77,
        runCount: 2,
        promptTokens: 1200,
        completionTokens: 800,
      },
      {
        model: "gpt-4o-mini",
        costUsd: 0.18,
        runCount: 1,
        promptTokens: 300,
        completionTokens: 120,
      },
    ],
    ...overrides,
  }
}

function renderOverview(
  props: Partial<ComponentProps<typeof AgentOverviewTab>> = {}
) {
  const now = new Date().toISOString()
  return render(
    <MemoryRouter>
      <AgentOverviewTab
        recentThreads={[]}
        agentId="agent_created"
        configurationVersions={[
          {
            id: "version_1",
            agentId: "agent_created",
            version: 1,
            systemPrompt: "Research carefully.",
            model: "gpt-4o-mini",
            maxCostPerRunUsd: null,
            nativeTools: ["documents"],
            createdAt: now,
          },
        ]}
        {...props}
      />
    </MemoryRouter>
  )
}

describe("AgentOverviewTab observability", () => {
  beforeEach(() => {
    vi.mocked(getAgentUsage).mockReset()
  })

  it("shows loading state while usage is fetched", () => {
    vi.mocked(getAgentUsage).mockReturnValueOnce(new Promise(() => {}))

    renderOverview()

    expect(screen.getByTestId("agent-usage-loading")).toHaveTextContent(
      /Loading usage/
    )
  })

  it("renders populated usage cost and model breakdown", async () => {
    vi.mocked(getAgentUsage).mockResolvedValueOnce(sampleUsage())

    renderOverview()

    expect(await screen.findByTestId("agent-usage-panel")).toBeInTheDocument()
    expect(screen.getByText("$5.95")).toBeInTheDocument()
    expect(screen.getByText(/3 completed runs/)).toBeInTheDocument()
    expect(
      screen.getByTestId("usage-model-claude-opus-4-6")
    ).toHaveTextContent("$5.77")
    expect(screen.getByTestId("usage-model-gpt-4o-mini")).toHaveTextContent(
      "$0.18"
    )
    expect(getAgentUsage).toHaveBeenCalledWith("agent_created", 14)
  })

  it("renders empty usage state when no runs exist", async () => {
    vi.mocked(getAgentUsage).mockResolvedValueOnce(
      sampleUsage({
        totalCostUsd: 0,
        totalRuns: 0,
        daily: [],
        byModel: [],
      })
    )

    renderOverview()

    expect(await screen.findByTestId("agent-usage-panel")).toBeInTheDocument()
    expect(screen.getByText("$0.00")).toBeInTheDocument()
    expect(screen.getByText(/0 completed runs/)).toBeInTheDocument()
    expect(screen.getByText(/No completed runs in the last 14 days/)).toBeInTheDocument()
  })

  it("renders usage error state with retry", async () => {
    const user = userEvent.setup()
    vi.mocked(getAgentUsage)
      .mockRejectedValueOnce(new ApiError("Server unavailable", 500))
      .mockResolvedValueOnce(sampleUsage())

    renderOverview()

    expect(await screen.findByTestId("agent-usage-error")).toHaveTextContent(
      "Server unavailable"
    )
    await user.click(screen.getByRole("button", { name: "Retry usage load" }))
    expect(await screen.findByTestId("agent-usage-panel")).toBeInTheDocument()
    expect(getAgentUsage).toHaveBeenCalledTimes(2)
  })

  it("shows fixture notice when agentId is absent", () => {
    renderOverview({ agentId: undefined })

    expect(screen.getByTestId("agent-usage-fixture-notice")).toBeInTheDocument()
    expect(getAgentUsage).not.toHaveBeenCalled()
  })

  it("shows evaluations empty state with Learning CTA", () => {
    renderOverview({ agentId: undefined })

    expect(screen.getByTestId("evaluations-empty-state")).toBeInTheDocument()
    expect(
      screen.getByText(/Create a rubric for this agent in Learning/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Open Learning" })
    ).toHaveAttribute("href", "/learning")
  })

  it("lists evaluated runs when provided", async () => {
    getAgentUsage.mockResolvedValue({
      agentId: "agent_created",
      periodDays: 14,
      totalCostUsd: 0,
      totalRuns: 0,
      daily: [],
      byModel: [],
    })
    renderOverview({
      agentId: "agent_created",
      evaluations: [
        {
          runId: "run_eval_1",
          threadId: "thread_eval_1",
          threadTitle: "Support follow-up",
          score: 88,
          rubricName: "Support quality",
          evaluatedAt: "2026-06-09T12:00:00.000Z",
        },
      ],
    })

    expect(await screen.findByTestId("evaluations-list")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Support follow-up" })).toHaveAttribute(
      "href",
      "/threads/thread_eval_1"
    )
    expect(screen.getByText("88%")).toBeInTheDocument()
    expect(screen.getByText(/Support quality/)).toBeInTheDocument()
  })

  it("lists configuration versions when provided", () => {
    const now = new Date().toISOString()
    renderOverview({
      agentId: undefined,
      configurationVersions: [
        {
          id: "version_2",
          agentId: "agent_created",
          version: 2,
          systemPrompt: "Updated prompt",
          model: "claude-opus-4-6",
          maxCostPerRunUsd: 2,
          nativeTools: ["documents", "webSearch"],
          createdAt: now,
        },
        {
          id: "version_1",
          agentId: "agent_created",
          version: 1,
          systemPrompt: "Original prompt",
          model: "gpt-4o-mini",
          maxCostPerRunUsd: null,
          nativeTools: ["documents"],
          createdAt: now,
        },
      ],
    })

    expect(screen.getByTestId("version-history-panel")).toBeInTheDocument()
    expect(screen.getByTestId("version-history-item-2")).toHaveTextContent(
      "Version 2"
    )
    expect(screen.getByTestId("version-history-item-1")).toHaveTextContent(
      "Version 1"
    )
  })

  it("shows version history empty state when no versions are provided", () => {
    renderOverview({
      agentId: undefined,
      configurationVersions: [],
    })

    expect(
      screen.getByText(/No configuration versions recorded yet/)
    ).toBeInTheDocument()
  })
})
