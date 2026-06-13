import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { RecentThreadsSection } from "./recent-threads-section"

const threads = [
  {
    id: "thread_1",
    title: "Launch readiness weekly update",
    status: "finished" as const,
    model: "openai/gpt-4o-mini",
    mode: "agent" as const,
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
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
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
})
