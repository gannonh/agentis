import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { NewThreadPage } from "./new-thread"

const navigate = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("@/lib/api/use-runtime-health", () => ({
  useRuntimeHealth: () => ({
    health: { available: true, model: "gpt-4o-mini" },
    loading: false,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/lib/api/client", () => ({
  createThread: vi.fn().mockResolvedValue({
    thread: { id: "thread_test" },
    run: { id: "run_test" },
  }),
}))

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({
    projects: [{ id: "project_test", name: "Launch", status: "active" }],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

describe("NewThreadPage", () => {
  beforeEach(() => {
    navigate.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("navigates to thread detail after submit", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText("What's the task?")
    await user.type(input, "Plan my week")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/threads/thread_test", {
        state: { startRunId: "run_test" },
      })
    })
  })
})
