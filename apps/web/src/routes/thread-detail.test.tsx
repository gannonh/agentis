import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ThreadDetailPage } from "./thread-detail"
import { createAgentPromotionDraft } from "@/lib/api/agents-client"

const navigate = vi.fn()
let threadStatus: "active" | "finished" | "failed" = "finished"

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ threadId: "thread_test" }),
  }
})

vi.mock("@/lib/api/use-runtime-health", () => ({
  useRuntimeHealth: () => ({
    health: { available: true, model: "gpt-4o-mini" },
    loading: false,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-thread-tool-grants", () => ({
  useThreadToolGrants: () => ({
    grants: [],
    availableToolkits: [],
    grantToolkit: vi.fn(),
    revokeGrant: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-thread-session", () => ({
  useThreadSession: () => ({
    detail: {
      thread: {
        id: "thread_test",
        title: "Investigate support backlog",
        status: threadStatus,
        mode: "plan",
        model: "gpt-4o-mini",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      messages: [],
      runs: [],
      steps: [],
    },
    loading: false,
    error: null,
    streaming: false,
    latestRun: null,
    steps: [],
    canAbort: false,
    submitFollowUp: vi.fn(),
    abortActiveRun: vi.fn(),
    getMessageText: vi.fn(() => ""),
  }),
}))

vi.mock("@/lib/api/agents-client", () => ({
  createAgentPromotionDraft: vi.fn().mockResolvedValue({
    draft: { id: "draft_test" },
  }),
}))

describe("ThreadDetailPage promotion action", () => {
  beforeEach(() => {
    navigate.mockReset()
    threadStatus = "finished"
    vi.mocked(createAgentPromotionDraft).mockClear()
  })

  it("creates a promotion draft and navigates from a finished thread", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await user.click(screen.getByRole("button", { name: /promote to agent/i }))

    await waitFor(() => {
      expect(createAgentPromotionDraft).toHaveBeenCalledWith("thread_test")
      expect(navigate).toHaveBeenCalledWith("/agents/promote/draft_test")
    })
  })

  it("explains why active threads cannot be promoted", () => {
    threadStatus = "active"

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText("Finish this thread before promoting it to an agent.")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /promote to agent/i })
    ).not.toBeInTheDocument()
  })
})
