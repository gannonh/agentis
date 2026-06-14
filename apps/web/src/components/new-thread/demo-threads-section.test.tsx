import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import { DemoThreadsSection } from "./demo-threads-section"

describe("DemoThreadsSection", () => {
  it("renders seeded demo thread links when present", () => {
    render(
      <MemoryRouter>
        <DemoThreadsSection
          threads={[
            {
              id: "seed_thread_launch_plan",
              title: "Launch readiness weekly update",
              status: "finished",
              model: "openai/gpt-4o-mini",
              mode: "agent",
              starred: false,
              hasPendingApproval: false,
              agentNameSnapshot: "Launch PM Copilot",
              createdAt: "2026-06-10T12:00:00.000Z",
              updatedAt: "2026-06-12T12:00:00.000Z",
              summary: "Launch readiness is on track with two blockers.",
            },
          ]}
        />
      </MemoryRouter>
    )

    expect(screen.getByText("Demo threads")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /launch readiness weekly update/i })
    ).toHaveAttribute("href", "/threads/seed_thread_launch_plan")
    expect(screen.getByText("Launch PM Copilot")).toBeInTheDocument()
  })

  it("supports star toggles and Agentis fallback", async () => {
    const onToggleStar = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DemoThreadsSection
          threads={[
            {
              id: "seed_thread_launch_plan",
              title: "Launch readiness weekly update",
              status: "active",
              model: "openai/gpt-4o-mini",
              mode: "plan",
              starred: true,
              hasPendingApproval: true,
              agentId: GENERIC_AGENTIS_AGENT_ID,
              createdAt: "2026-06-10T12:00:00.000Z",
              updatedAt: "2026-06-12T12:00:00.000Z",
              summary: "Launch readiness is on track with two blockers.",
            },
          ]}
          onToggleStar={onToggleStar}
        />
      </MemoryRouter>
    )

    expect(screen.getByText("Waiting")).toBeInTheDocument()
    expect(screen.getByText("Agentis")).toBeInTheDocument()
    await user.click(screen.getByLabelText("Unstar thread"))
    expect(onToggleStar).toHaveBeenCalledWith("seed_thread_launch_plan")
  })

  it("renders nothing when no demo threads are provided", () => {
    const { container } = render(
      <MemoryRouter>
        <DemoThreadsSection threads={[]} />
      </MemoryRouter>
    )

    expect(container).toBeEmptyDOMElement()
  })
})
