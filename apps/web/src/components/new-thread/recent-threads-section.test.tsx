import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import { RecentThreadsSection } from "./recent-threads-section"

const threads = [
  {
    id: "thread_1",
    title: "Launch readiness weekly update",
    status: "finished" as const,
    model: "openai/gpt-4o-mini",
    mode: "agent" as const,
    starred: true,
    hasPendingApproval: false,
    agentNameSnapshot: "Launch PM Copilot",
    createdAt: "2026-06-10T12:00:00.000Z",
    updatedAt: "2026-06-12T12:00:00.000Z",
    lastRunStatus: "completed" as const,
    summary: "Launch readiness is on track with two blockers to resolve.",
    messageCount: 4,
  },
]

describe("RecentThreadsSection", () => {
  it("renders thread summaries and metadata", () => {
    render(
      <MemoryRouter>
        <RecentThreadsSection threads={threads} />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("link", { name: /launch readiness weekly update/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Launch readiness is on track with two blockers to resolve.")
    ).toBeInTheDocument()
    expect(screen.getByText("Launch PM Copilot")).toBeInTheDocument()
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Unstar thread")).toBeInTheDocument()
  })

  it("shows waiting badge and agent fallback", () => {
    render(
      <MemoryRouter>
        <RecentThreadsSection
          threads={[
            {
              ...threads[0],
              hasPendingApproval: true,
              agentNameSnapshot: null,
              agentId: GENERIC_AGENTIS_AGENT_ID,
            },
          ]}
        />
      </MemoryRouter>
    )

    expect(screen.getByText("Waiting")).toBeInTheDocument()
    expect(screen.getByText("Agentis")).toBeInTheDocument()
  })

  it("calls star toggle handler", async () => {
    const onToggleStar = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <RecentThreadsSection threads={threads} onToggleStar={onToggleStar} />
      </MemoryRouter>
    )

    await user.click(screen.getByLabelText("Unstar thread"))
    expect(onToggleStar).toHaveBeenCalledWith("thread_1")
  })

  it("uses fallback copy when summary is missing", () => {
    render(
      <MemoryRouter>
        <RecentThreadsSection
          threads={[{ ...threads[0], summary: null }]}
        />
      </MemoryRouter>
    )

    expect(
      screen.getByText("Open this thread to continue the conversation.")
    ).toBeInTheDocument()
  })

  it("shows loading state", () => {
    render(
      <MemoryRouter>
        <RecentThreadsSection threads={[]} loading />
      </MemoryRouter>
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it("renders every thread supplied by the caller", () => {
    const callerLimitedThreads = Array.from({ length: 4 }, (_, index) => ({
      ...threads[0],
      id: `thread_${index}`,
      title: `Thread ${index}`,
    }))

    render(
      <MemoryRouter>
        <RecentThreadsSection threads={callerLimitedThreads} />
      </MemoryRouter>
    )

    expect(screen.getAllByRole("link")).toHaveLength(4)
  })
})
