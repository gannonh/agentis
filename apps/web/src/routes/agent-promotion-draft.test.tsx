import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { AgentPromotionDraftPage } from "./agent-promotion-draft"
import {
  createAgentFromPromotionDraft,
  getAgentPromotionDraft,
  updateAgentPromotionDraft,
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

vi.mock("@/lib/api/agents-client", () => {
  const draft = {
    id: "draft_test",
    threadId: "thread_test",
    sourceThreadTitle: "Investigate support backlog",
    name: "Support Backlog Agent",
    description: "Reviews backlog patterns.",
    systemPrompt: "Review support backlog patterns.",
    model: "gpt-4o-mini",
    toolGrants: [{ toolkitSlug: "github", connectionId: "conn_github" }],
    intelligence: {
      suggestedPurpose: "Review support backlog patterns.",
      repeatedSteps: ["Review incoming issues", "Assign severity"],
      requiredTools: [{ toolkitSlug: "github", connectionId: "conn_github" }],
      suggestedPrompt: "Use the source thread context to review support backlog patterns.",
      modelRecommendation: {
        model: "gpt-4.1-mini",
        reason: "Best fit for careful triage.",
      },
      rubricCriteria: ["Finds the right issue", "Explains the severity"],
    },
    editedFields: ["systemPrompt"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    getAgentPromotionDraft: vi.fn().mockResolvedValue({ draft }),
    createAgentFromPromotionDraft: vi.fn().mockResolvedValue({
      agent: { id: "agent_test" },
      configurationVersions: [],
      toolGrants: [],
    }),
    updateAgentPromotionDraft: vi.fn().mockResolvedValue({
      draft: {
        ...draft,
        intelligence: {
          ...draft.intelligence,
          rubricCriteria: ["Assigns severity", "Explains handoff"],
        },
        editedFields: ["rubricCriteria"],
      },
    }),
  }
})

describe("AgentPromotionDraftPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(getAgentPromotionDraft).mockClear()
    vi.mocked(createAgentFromPromotionDraft).mockClear()
    vi.mocked(updateAgentPromotionDraft).mockClear()
  })

  it("loads a draft, submits edits, creates an agent, and navigates", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    expect(await screen.findByText("Create agent from thread")).toBeInTheDocument()
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

  it("shows generated suggestions and edited-field markers", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    const suggestions = (await screen.findByText("Generated suggestions")).closest(
      "section"
    )
    expect(suggestions).not.toBeNull()
    const suggestionContent = within(suggestions as HTMLElement)
    expect(
      suggestionContent.getByText("Review support backlog patterns.")
    ).toBeInTheDocument()
    expect(suggestionContent.getByText("Review incoming issues")).toBeInTheDocument()
    expect(suggestionContent.getByText("Assign severity")).toBeInTheDocument()
    expect(suggestionContent.getByText("github")).toBeInTheDocument()
    expect(
      suggestionContent.getByText(
        "Use the source thread context to review support backlog patterns."
      )
    ).toBeInTheDocument()
    expect(
      suggestionContent.getByText("Recommended answer engine: gpt-4.1-mini")
    ).toBeInTheDocument()
    expect(suggestionContent.getByText("Instructions edited")).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/^name/i))
    await user.type(screen.getByLabelText(/^name/i), "Support Triage Agent")

    expect(screen.getByText("Name edited")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Support Triage Agent")).toBeInTheDocument()
  })

  it("lets users edit rubric criteria before creating the agent", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    const rubric = await screen.findByLabelText(/rubric criteria/i)
    expect(rubric).toHaveValue("Finds the right issue\nExplains the severity")

    await user.clear(rubric)
    await user.type(rubric, "Assigns severity\nExplains handoff")
    await user.click(screen.getByRole("button", { name: /create agent/i }))

    await waitFor(() => {
      expect(updateAgentPromotionDraft).toHaveBeenCalledWith("draft_test", {
        intelligence: expect.objectContaining({
          rubricCriteria: ["Assigns severity", "Explains handoff"],
        }),
      })
      expect(createAgentFromPromotionDraft).toHaveBeenCalled()
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
})
