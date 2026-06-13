import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
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
