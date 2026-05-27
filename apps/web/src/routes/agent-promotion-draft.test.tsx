import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { AgentPromotionDraftPage } from "./agent-promotion-draft"
import { GeneratedSuggestions } from "./agent-promotion-draft-suggestions"
import {
  createAgentFromPromotionDraft,
  getAgentPromotionDraft,
  updateAgentPromotionDraft,
} from "@/lib/api/agents-client"

const navigate = vi.fn()

const { baseDraft } = vi.hoisted(() => {
  const now = new Date().toISOString()
  return {
    baseDraft: {
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
        suggestedPrompt:
          "Use the source thread context to review support backlog patterns.",
        modelRecommendation: {
          model: "gpt-4.1-mini",
          reason: "Best fit for careful triage.",
        },
        rubricCriteria: ["Finds the right issue", "Explains the severity"],
      },
      editedFields: ["systemPrompt"],
      proposedToolGrants: [],
      unsupportedSourceSteps: [],
      createdAt: now,
      updatedAt: now,
    },
  }
})

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ draftId: "draft_test" }),
  }
})

vi.mock("@/lib/api/agents-client", () => ({
  getAgentPromotionDraft: vi.fn().mockResolvedValue({ draft: baseDraft }),
  createAgentFromPromotionDraft: vi.fn().mockResolvedValue({
    agent: { id: "agent_test" },
    configurationVersions: [],
    toolGrants: [],
  }),
  updateAgentPromotionDraft: vi.fn().mockResolvedValue({
    draft: {
      ...baseDraft,
      intelligence: {
        ...baseDraft.intelligence,
        rubricCriteria: ["Assigns severity", "Explains handoff"],
      },
      editedFields: ["rubricCriteria"],
    },
  }),
}))

describe("AgentPromotionDraftPage", () => {
  beforeEach(() => {
    navigate.mockReset()
    vi.mocked(getAgentPromotionDraft).mockClear()
    vi.mocked(getAgentPromotionDraft).mockResolvedValue({ draft: baseDraft })
    vi.mocked(createAgentFromPromotionDraft).mockClear()
    vi.mocked(updateAgentPromotionDraft).mockClear()
  })

  it("renders repeated suggestions without duplicate React keys", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <GeneratedSuggestions
        draft={{
          ...baseDraft,
          toolGrants: [],
          intelligence: {
            repeatedSteps: ["Assign severity", "Assign severity"],
            requiredTools: [],
            rubricCriteria: [],
          },
          editedFields: [],
        }}
        editedFields={[]}
        rubricText=""
        onRubricChange={vi.fn()}
      />
    )

    expect(screen.getAllByText("Assign severity")).toHaveLength(2)
    expect(consoleError.mock.calls.flat().join("\n")).not.toContain(
      "Encountered two children with the same key"
    )
    consoleError.mockRestore()
  })

  it("loads a draft, submits edits, creates an agent, and navigates", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    expect(
      await screen.findByText("Create agent from thread")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Start with this thread's context, review the setup, then create a reusable agent."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Review agent setup")).toBeInTheDocument()
    expect(
      await screen.findByText("Started from thread: Investigate support backlog")
    ).toBeInTheDocument()
    expect(
      await screen.findByDisplayValue("Support Backlog Agent")
    ).toBeInTheDocument()
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

  it("renders proposed grants and validation checklist", async () => {
    vi.mocked(getAgentPromotionDraft).mockResolvedValueOnce({
      draft: {
        ...baseDraft,
        toolGrants: [],
        proposedToolGrants: [
          {
            toolkitSlug: "slack",
            toolName: "SLACK_SEND_MESSAGE",
            displayName: "Slack send message",
            required: true,
            validationStatus: "missing_access",
            remediation: {
              code: "toolkit_not_connected",
              message: "Connect Slack before creating this agent.",
            },
          },
        ],
        unsupportedSourceSteps: [
          {
            id: "step-crm",
            title: "Lookup CRM account",
            reason: "unsupported_tool",
            toolName: "CRM_LOOKUP",
            details: "No matching integration is available.",
          },
        ],
      },
    })
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    expect(await screen.findByText("First-run validation")).toBeInTheDocument()
    expect(screen.getByText("Slack send message")).toBeInTheDocument()
    expect(
      screen.getByText("Connect Slack before creating this agent.")
    ).toBeInTheDocument()
    expect(screen.getByText("Lookup CRM account")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create agent/i })).toBeDisabled()
  })

  it("shows generated suggestions and edited-field markers", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    const suggestions = (
      await screen.findByText("Generated suggestions")
    ).closest("section")
    expect(suggestions).not.toBeNull()
    const suggestionContent = within(suggestions as HTMLElement)
    expect(
      suggestionContent.getByText("Review support backlog patterns.")
    ).toBeInTheDocument()
    expect(
      suggestionContent.getByText("Review incoming issues")
    ).toBeInTheDocument()
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
    expect(
      suggestionContent.getByText("Instructions edited")
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/^name/i))
    await user.type(screen.getByLabelText(/^name/i), "Support Triage Agent")

    expect(screen.getByText("Name edited")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Support Triage Agent")).toBeInTheDocument()
  })

  it("submits rubric criteria edits with the create-agent command", async () => {
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
      expect(updateAgentPromotionDraft).not.toHaveBeenCalled()
      expect(createAgentFromPromotionDraft).toHaveBeenCalledWith(
        "draft_test",
        expect.objectContaining({
          draftUpdates: {
            intelligence: {
              rubricCriteria: ["Assigns severity", "Explains handoff"],
            },
          },
        })
      )
    })
  })

  it("clears the rubric edited marker when text matches the loaded draft", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgentPromotionDraftPage />
      </MemoryRouter>
    )

    const rubric = await screen.findByLabelText(/rubric criteria/i)
    await user.clear(rubric)
    await user.type(rubric, "Assigns severity")
    expect(screen.getByText("Rubric criteria edited")).toBeInTheDocument()

    await user.clear(rubric)
    await user.type(rubric, "Finds the right issue\nExplains the severity")
    expect(screen.queryByText("Rubric criteria edited")).not.toBeInTheDocument()
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
