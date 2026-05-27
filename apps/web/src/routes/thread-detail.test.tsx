import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ThreadDetailPage } from "./thread-detail"
import { createAgentPromotionDraft } from "@/lib/api/agents-client"

const navigate = vi.fn()
let threadStatus: "active" | "finished" | "failed" = "active"
let threadAgentId: string | undefined

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
        agentId: threadAgentId,
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

describe("ThreadDetailPage create-agent action", () => {
  beforeEach(() => {
    navigate.mockReset()
    threadStatus = "active"
    threadAgentId = undefined
    vi.mocked(createAgentPromotionDraft).mockClear()
  })

  it("creates an agent draft and navigates from an active thread", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await user.click(
      screen.getByRole("button", { name: /create agent from thread/i })
    )

    await waitFor(() => {
      expect(createAgentPromotionDraft).toHaveBeenCalledWith("thread_test")
      expect(navigate).toHaveBeenCalledWith("/agents/new/from-thread/draft_test")
    })
  })

  it("shows seed-and-review loading copy while preparing the agent setup", async () => {
    let resolveDraft: (value: { draft: { id: string } }) => void = () => {}
    vi.mocked(createAgentPromotionDraft).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDraft = resolve
      }) as ReturnType<typeof createAgentPromotionDraft>
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await user.click(
      screen.getByRole("button", { name: /create agent from thread/i })
    )

    expect(
      screen.getByRole("button", { name: /preparing agent setup/i })
    ).toBeInTheDocument()

    resolveDraft({ draft: { id: "draft_test" } })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/agents/new/from-thread/draft_test")
    })
  })

  it("announces create-agent errors", async () => {
    vi.mocked(createAgentPromotionDraft).mockRejectedValueOnce(
      new Error("Could not prepare agent setup.")
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await user.click(
      screen.getByRole("button", { name: /create agent from thread/i })
    )

    expect(
      await screen.findByText("Could not prepare agent setup.")
    ).toBeInTheDocument()
  })

  it("keeps the create-agent action available for finished threads", () => {
    threadStatus = "finished"

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("button", { name: /create agent from thread/i })
    ).toBeInTheDocument()
  })

  it("explains why agent-owned threads cannot create another agent", () => {
    threadAgentId = "agent_existing"

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(
      screen.queryByRole("button", { name: /create agent from thread/i })
    ).not.toBeInTheDocument()
    const unavailableAction = screen.getByRole("button", {
      name: "Open agent",
    })
    expect(unavailableAction).toHaveAttribute("href", "/agents/agent_existing")
    expect(unavailableAction).toHaveAccessibleDescription(
      "This thread already uses an agent. Open that agent to adjust future runs."
    )
    expect(
      screen.getByText(
        "This thread already uses an agent. Open that agent to adjust future runs."
      )
    ).toBeInTheDocument()
  })
})
