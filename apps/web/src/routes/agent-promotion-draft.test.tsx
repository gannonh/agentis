import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { AgentPromotionDraftPage } from "./agent-promotion-draft"
import {
  createAgentFromPromotionDraft,
  getAgentPromotionDraft,
} from "@/lib/api/agents-client"

const navigate = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ draftId: "draft_test" }),
  }
})

vi.mock("@/lib/api/agents-client", () => ({
  getAgentPromotionDraft: vi.fn().mockResolvedValue({
    draft: {
      id: "draft_test",
      threadId: "thread_test",
      sourceThreadTitle: "Investigate support backlog",
      name: "Support Backlog Agent",
      description: "Reviews backlog patterns.",
      systemPrompt: "Review support backlog patterns.",
      model: "gpt-4o-mini",
      toolGrants: [{ toolkitSlug: "github", connectionId: "conn_github" }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  createAgentFromPromotionDraft: vi.fn().mockResolvedValue({
    agent: { id: "agent_test" },
    configurationVersions: [],
    toolGrants: [],
  }),
}))

describe("AgentPromotionDraftPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(getAgentPromotionDraft).mockClear()
    vi.mocked(createAgentFromPromotionDraft).mockClear()
  })

  it("loads a draft, submits edits, creates an agent, and navigates", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    expect(await screen.findByText("Create agent from thread")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Start with this thread's context, review the setup, then create a reusable agent."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Review agent setup")).toBeInTheDocument()
    expect(
      await screen.findByText("Started from thread: Investigate support backlog")
    ).toBeInTheDocument()
    expect(await screen.findByDisplayValue("Support Backlog Agent")).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/^name/i))
    await user.type(screen.getByLabelText(/^name/i), "Support Triage Agent")
    await user.clear(screen.getByLabelText(/^description/i))
    await user.type(
      screen.getByLabelText(/^description/i),
      "Routes support backlog patterns."
    )
    await user.clear(screen.getByLabelText(/^answer engine/i))
    await user.type(screen.getByLabelText(/^answer engine/i), "gpt-4.1-mini")
    await user.clear(screen.getByLabelText(/^instructions/i))
    await user.type(
      screen.getByLabelText(/^instructions/i),
      "Assign severity and next steps."
    )
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    await waitFor(() => {
      expect(createAgentFromPromotionDraft).toHaveBeenCalledWith("draft_test", {
        name: "Support Triage Agent",
        description: "Routes support backlog patterns.",
        model: "gpt-4.1-mini",
        systemPrompt: "Assign severity and next steps.",
        toolGrants: [{ toolkitSlug: "github", connectionId: "conn_github" }],
      })
      expect(navigate).toHaveBeenCalledWith("/agents/agent_test")
    })
  })

  it("routes cancel back to the source thread after loading the draft", async () => {
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    const cancel = await screen.findByText("Cancel")

    expect(cancel.closest("a")).toHaveAttribute("href", "/threads/thread_test")
  })

  it("keeps validation errors visible without creating an agent", async () => {
    vi.mocked(createAgentFromPromotionDraft).mockRejectedValueOnce(
      new Error("Name is required to create this agent.")
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    await screen.findByDisplayValue("Support Backlog Agent")
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    expect(
      await screen.findByText("Name is required to create this agent.")
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("shows direct validation guidance when creation fails without a message", async () => {
    vi.mocked(createAgentFromPromotionDraft).mockRejectedValueOnce(null)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    await screen.findByDisplayValue("Support Backlog Agent")
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    expect(
      await screen.findByText("Check the required setup fields and try again.")
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
