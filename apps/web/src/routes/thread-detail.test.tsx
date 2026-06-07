import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import { ThreadDetailPage } from "./thread-detail"
import { createAgentPromotionDraft } from "@/lib/api/agents-client"
import { decideToolApproval } from "@/lib/api/client"
import { listArtifacts } from "@/lib/api/projects-client"

const navigate = vi.fn()
let threadStatus: "active" | "finished" | "failed" = "active"
let threadAgentId: string | undefined = GENERIC_AGENTIS_AGENT_ID
let threadAgentName: string | null | undefined = "Agentis"
let includePendingApproval = false
let pendingToolName = "createWorkspaceFile"
const refresh = vi.fn()

function messageText(message: { parts: Array<{ type: string; text?: string }> }) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
}

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
  useThreadSession: () => {
    const pendingStep = {
      id: "step_pending",
      runId: "run_pending",
      type: "tool-call" as const,
      status: "pending" as const,
      title: "Create workspace file",
      payload: {
        provider: "native",
        toolCallId: "tool_call_pending",
        toolName: pendingToolName,
        workspaceId: "workspace_agentis",
        output:
          pendingToolName === "runWorkspaceCommand"
            ? {
                executionId: "wexec_1",
                kind: "command",
                status: "pending_approval",
              }
            : {
                path: "notes.md",
                operation: "create",
                status: "pending_approval",
              },
        changedFiles: [],
        approval:
          pendingToolName === "runWorkspaceCommand"
            ? { status: "pending", executionId: "wexec_1" }
            : { status: "pending", editId: "wedit_1" },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const steps = includePendingApproval ? [pendingStep] : []
    const messages = includePendingApproval
      ? [
          {
            id: "msg_user",
            threadId: "thread_test",
            role: "user" as const,
            parts: [{ type: "text" as const, text: "Create a file called notes.md" }],
            status: "completed" as const,
            createdAt: new Date().toISOString(),
          },
          {
            id: "msg_assistant",
            threadId: "thread_test",
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: "" }],
            status: "completed" as const,
            createdAt: new Date().toISOString(),
          },
        ]
      : []
    return {
      detail: {
        thread: {
          id: "thread_test",
          title: "Investigate support backlog",
          status: threadStatus,
          mode: "plan",
          model: "gpt-4o-mini",
          agentId: threadAgentId,
          agentNameSnapshot: threadAgentName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        messages,
        runs: [],
        steps,
      },
      loading: false,
      error: null,
      streaming: false,
      latestRun: null,
      steps,
      canAbort: false,
      submitFollowUp: vi.fn(),
      abortActiveRun: vi.fn(),
      refresh,
      getMessageText: vi.fn(messageText),
    }
  },
}))

vi.mock("@/lib/api/client", () => ({
  decideToolApproval: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/api/agents-client", () => ({
  createAgentPromotionDraft: vi.fn().mockResolvedValue({
    draft: { id: "draft_test" },
  }),
}))

vi.mock("@/lib/api/projects-client", () => ({
  artifactWorkspacePath: (id: string) => `/artifacts/${id}`,
  documentWorkspacePath: (id: string) => `/documents/${id}`,
  artifactLaunchPath: (artifact: { id: string; type: string }) => {
    if (artifact.type === "document") return `/documents/${artifact.id}`
    if (
      artifact.type === "webpage" ||
      artifact.type === "slides" ||
      artifact.type === "app"
    ) {
      return `/artifacts/${artifact.id}`
    }
    return null
  },
  artifactLaunchLabel: (type: string) => {
    if (type === "document") return "Open document"
    if (type === "app") return "Open app"
    if (type === "webpage" || type === "slides") return "Open artifact"
    return null
  },
  listArtifacts: vi.fn().mockResolvedValue([]),
}))

describe("ThreadDetailPage create-agent action", () => {
  beforeEach(() => {
    navigate.mockReset()
    threadStatus = "active"
    threadAgentId = GENERIC_AGENTIS_AGENT_ID
    threadAgentName = "Agentis"
    includePendingApproval = false
    pendingToolName = "createWorkspaceFile"
    refresh.mockClear()
    vi.mocked(createAgentPromotionDraft).mockClear()
    vi.mocked(decideToolApproval).mockClear()
    vi.mocked(listArtifacts).mockResolvedValue([])
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

  it("approves pending workspace edits inline", async () => {
    includePendingApproval = true
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Approve workspace edit?")).toBeInTheDocument()
    expect(screen.getByText(/createWorkspaceFile · notes.md/)).toBeInTheDocument()
    expect(screen.queryByText(/Changed notes\.md/)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Approve" }))

    await waitFor(() => {
      expect(decideToolApproval).toHaveBeenCalledWith(
        "run_pending",
        "tool_call_pending",
        "approve"
      )
      expect(refresh).toHaveBeenCalled()
    })
  })

  it("shows pending workspace approval after the user request without assistant filler", () => {
    includePendingApproval = true
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    const content = document.body.textContent ?? ""
    const userIndex = content.indexOf("Create a file called notes.md")
    const approvalIndex = content.indexOf("Approve workspace edit?")

    expect(userIndex).toBeGreaterThanOrEqual(0)
    expect(approvalIndex).toBeGreaterThan(userIndex)
    expect(screen.queryByText(/waiting for approval/i)).not.toBeInTheDocument()
  })

  it("generalizes pending approval copy for workspace executions", () => {
    includePendingApproval = true
    pendingToolName = "runWorkspaceCommand"

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Approve workspace action?")).toBeInTheDocument()
    expect(screen.getByText(/runWorkspaceCommand/)).toBeInTheDocument()
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

  it("shows the active generic agent near the composer", () => {
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Active agent")).toBeInTheDocument()
    expect(screen.getByText("Agentis")).toBeInTheDocument()
  })

  it("links agent-owned threads to their agent", () => {
    threadAgentId = "agent_existing"
    threadAgentName = "Support Triage Agent"

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
    const agentLink = screen.getByRole("link", { name: "Support Triage Agent" })
    expect(agentLink).toHaveAttribute("href", "/agents/agent_existing")
    expect(
      screen.queryByText(
        "This thread already uses an agent. Open that agent to adjust future runs."
      )
    ).not.toBeInTheDocument()
  })

  it("lists durable thread artifacts outside the run timeline", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        id: "artifact_deck",
        title: "How to Create a Good Changelog",
        type: "slides",
        description: null,
        contentFormat: "html",
        mimeType: "text/html",
        sizeBytes: 2048,
        previewText: null,
        metadata: null,
        visibilityScope: "thread",
        threadId: "thread_test",
        threadTitleSnapshot: "Investigate support backlog",
        projectId: null,
        projectNameSnapshot: null,
        runId: "run_1",
        agentId: GENERIC_AGENTIS_AGENT_ID,
        agentNameSnapshot: "Agentis",
        currentVersionId: "version_1",
        currentVersion: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Durable artifacts" })
    ).toBeInTheDocument()
    expect(listArtifacts).toHaveBeenCalledWith({ threadId: "thread_test" })
    expect(screen.getByText("How to Create a Good Changelog")).toBeInTheDocument()
    expect(screen.getByText("slides · html · v2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open artifact" })).toHaveAttribute(
      "href",
      "/artifacts/artifact_deck"
    )
  })
})
