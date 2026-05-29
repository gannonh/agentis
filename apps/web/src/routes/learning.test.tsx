import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, vi } from "vitest"
import type { MemoriesListResponse } from "@workspace/shared"
import { LearningCandidatesSection } from "@/components/learning/learning-candidates-section"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import type { LearningCandidate } from "@/fixtures/schema"
import { LearningPage } from "./learning"
import { MemoriesPage } from "./memories"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  })
}

describe("LearningPage", () => {
  it("expands API-backed threads with no linked memory candidates", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/api/threads")) {
          return jsonResponse([
            {
              id: "seed_thread_customer_voice",
              title: "Customer voice synthesis",
              status: "finished",
              model: "gpt-4o-mini",
              mode: "agent",
              agentId: "seed_agent_customer_insights",
              agentNameSnapshot: "Customer Insights Analyst",
              createdAt: "2026-05-15T15:30:00.000Z",
              updatedAt: "2026-05-21T15:30:00.000Z",
              messageCount: 2,
            },
          ])
        }
        if (url.endsWith("/api/memories")) {
          return jsonResponse({ categories: [], memories: [] })
        }
        return jsonResponse({})
      })
    )

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    await screen.findByRole("heading", { name: "Customer voice synthesis" })
    const expandButton = screen.getByRole("button", {
      name: "Expand Customer voice synthesis",
    })

    await user.click(expandButton)

    expect(expandButton).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByText("No memory candidates linked yet")
    ).toBeInTheDocument()
  })

  it("renders API threads with accepted memory candidates from saved memory lineage", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/api/threads")) {
          return jsonResponse([
            {
              id: "seed_thread_launch_plan",
              title: "Launch readiness weekly update",
              status: "finished",
              model: "gpt-4o-mini",
              mode: "agent",
              agentId: "seed_agent_launch_pm",
              agentNameSnapshot: "Launch PM Copilot",
              createdAt: "2026-05-15T15:30:00.000Z",
              updatedAt: "2026-05-22T15:30:00.000Z",
              messageCount: 2,
            },
            {
              id: "seed_thread_customer_voice",
              title: "Customer voice synthesis",
              status: "finished",
              model: "gpt-4o-mini",
              mode: "agent",
              agentId: "seed_agent_customer_insights",
              agentNameSnapshot: "Customer Insights Analyst",
              createdAt: "2026-05-15T15:30:00.000Z",
              updatedAt: "2026-05-21T15:30:00.000Z",
              messageCount: 2,
            },
          ])
        }
        if (url.endsWith("/api/memories")) {
          return jsonResponse({
            categories: [],
            memories: [
              {
                id: "seed_memory_project_context_launch",
                content:
                  "Agentis is preparing foundation work for manual testing and e2e coverage.",
                category: "memory_category_project_context",
                usageGuidance: "Use when answering launch-readiness prompts.",
                tags: ["agentis", "launch"],
                importance: "high",
                date: "2026-05-22",
                scope: "agent",
                associatedAgent: "seed_agent_launch_pm",
                source: "thread-derived",
                sourceThreadId: "seed_thread_launch_plan",
                sourceThreadTitle: "Launch readiness weekly update",
                provenance: "Accepted from Launch readiness weekly update",
                pinnedToContext: true,
                createdAt: "2026-05-22T15:30:00.000Z",
                updatedAt: "2026-05-22T15:30:00.000Z",
              },
            ],
          })
        }
        if (url.endsWith("/api/agents")) {
          return jsonResponse([
            {
              id: "seed_agent_launch_pm",
              name: "Launch PM Copilot",
              description: "Plans launch readiness.",
              systemPrompt: "Plan launches.",
              model: "gpt-4o-mini",
              createdAt: "2026-05-22T15:30:00.000Z",
              updatedAt: "2026-05-22T15:30:00.000Z",
              toolGrantCount: 0,
              versionCount: 1,
            },
          ])
        }
        return jsonResponse({})
      })
    )

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", {
        name: "Launch readiness weekly update",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Customer voice synthesis" })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "Expand Launch readiness weekly update",
      })
    )

    const suggestions = within(
      screen.getByRole("region", { name: "Suggestions" })
    )
    expect(
      suggestions.getByText(
        "Agentis is preparing foundation work for manual testing and e2e coverage."
      )
    ).toBeInTheDocument()
    expect(suggestions.getByText("Memory")).toBeInTheDocument()
    expect(suggestions.getAllByText("Resolved").length).toBeGreaterThanOrEqual(
      1
    )
    expect(
      suggestions.queryByRole("button", { name: "Save memory" })
    ).not.toBeInTheDocument()
  })

  it("excludes unassigned conversations from memory scope options", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith("/api/threads")) {
          return jsonResponse([
            {
              id: "thread_unassigned",
              title: "Unassigned conversation",
              status: "finished",
              model: "gpt-4o-mini",
              mode: "plan",
              agentId: null,
              agentNameSnapshot: null,
              createdAt: "2026-05-15T15:30:00.000Z",
              updatedAt: "2026-05-21T15:30:00.000Z",
              messageCount: 2,
            },
            {
              id: "thread_agent",
              title: "Assigned conversation",
              status: "finished",
              model: "gpt-4o-mini",
              mode: "agent",
              agentId: "agent_research",
              agentNameSnapshot: "Research Agent",
              createdAt: "2026-05-15T15:30:00.000Z",
              updatedAt: "2026-05-21T15:30:00.000Z",
              messageCount: 2,
            },
          ])
        }
        if (url.endsWith("/api/memories")) {
          return jsonResponse({
            categories: [
              {
                id: "memory_category_preference",
                name: "Preference",
                description: "How a user wants agents to work or communicate.",
                count: 1,
              },
            ],
            memories: [
              {
                id: "memory_preference",
                content: "Use concise summaries.",
                category: "memory_category_preference",
                usageGuidance: "Use when summarizing work.",
                tags: [],
                importance: "medium",
                date: "2026-05-22",
                scope: "global",
                associatedAgent: null,
                associatedAgents: [],
                source: "thread-derived",
                sourceThreadId: "thread_unassigned",
                sourceThreadTitle: "Unassigned conversation",
                provenance: "Accepted from Unassigned conversation",
                pinnedToContext: false,
                createdAt: "2026-05-22T15:30:00.000Z",
                updatedAt: "2026-05-22T15:30:00.000Z",
              },
            ],
          })
        }
        return jsonResponse({})
      })
    )

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    await user.click(
      await screen.findByRole("button", {
        name: "Expand Unassigned conversation",
      })
    )
    await user.click(await screen.findByRole("button", { name: "Edit Memory" }))
    await user.click(screen.getByPlaceholderText("Select scope"))

    expect(
      await screen.findByRole("option", { name: "Global (all agents)" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Research Agent" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "Unassigned agent" })
    ).not.toBeInTheDocument()
  })

  it("renders learning dashboard aligned with comp", () => {
    const { container } = render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )
    const pageLayout = container.firstElementChild

    expect(pageLayout).toHaveClass("mx-auto")
    expect(pageLayout).toHaveClass("max-w-[974px]")

    expect(
      screen.getByRole("heading", { name: "Learning" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Your agents learn from conversations")
    ).toBeInTheDocument()
    expect(screen.getByText("What agents can learn")).toBeInTheDocument()
    const learningPillars = screen.getByRole("region", {
      name: "Learning pillars",
    })
    expect(learningPillars).toHaveClass("grid")
    expect(learningPillars.className).toContain("repeat(auto-fit")
    expect(screen.getByText(/Skills — Reusable techniques/)).toBeInTheDocument()
    expect(
      screen.getByText(/Memories — Facts and preferences/)
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("2 pinned")).toBeInTheDocument()
    expect(screen.getByText("View all 15 skills →")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Memories" })
    ).toBeInTheDocument()
    expect(screen.getByText("3 saved")).toBeInTheDocument()
    expect(screen.getByText("User Fact: 1")).toBeInTheDocument()
    expect(screen.getByText("Preference: 1")).toBeInTheDocument()
    expect(screen.getByText("Active Work: 1")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Rubrics" })).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Creating Agent" })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: "Dismiss" }).length
    ).toBeGreaterThanOrEqual(1)
  })

  it("renders suggestions only after expanding their source conversation", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(
      screen.queryByRole("region", { name: "Learning candidates" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("region", { name: "Suggestions" })
    ).not.toBeInTheDocument()

    const expandButton = screen.getByRole("button", {
      name: "Expand Creating Agent",
    })
    expect(expandButton).toHaveAttribute("aria-expanded", "false")

    await user.click(expandButton)

    expect(expandButton).toHaveAttribute("aria-expanded", "true")
    const suggestionsSection = screen.getByRole("region", {
      name: "Suggestions",
    })
    const suggestions = within(suggestionsSection)

    expect(
      suggestions.getByRole("heading", { name: "Suggestions" })
    ).toBeInTheDocument()
    expect(suggestionsSection.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    expect(
      suggestions.getByText("Capture review preference")
    ).toBeInTheDocument()
    expect(suggestions.getByText("Mocked LLM-derived seed")).toBeInTheDocument()
    expect(
      suggestions.getAllByText("Creating Agent").length
    ).toBeGreaterThanOrEqual(1)
    expect(suggestions.getAllByText("Memory").length).toBeGreaterThanOrEqual(1)
    expect(suggestions.getByText("82% confidence")).toBeInTheDocument()
    expect(
      suggestions.getByRole("heading", { name: "Pending" })
    ).toBeInTheDocument()
    expect(suggestions.getAllByText("Pending").length).toBeGreaterThanOrEqual(1)
    expect(
      suggestions.getByRole("heading", { name: "Resolved" })
    ).toBeInTheDocument()
    expect(
      suggestions.getByText("Persist durable preferences")
    ).toBeInTheDocument()
    expect(
      suggestions.getByText("Prefer concise direct answers")
    ).toBeInTheDocument()
    expect(
      suggestions.getByText("Capture quality review habits")
    ).toBeInTheDocument()

    const sourceThread = screen.getByRole("heading", { name: "Creating Agent" })
    const nextThread = screen.getByRole("heading", {
      name: "Editor gate review",
    })
    const suggestion = suggestions.getByText("Capture review preference")

    expect(sourceThread.compareDocumentPosition(suggestion)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(suggestion.compareDocumentPosition(nextThread)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )

    const saveMemoryButton = suggestions.getByRole("button", {
      name: "Save memory",
    })
    expect(saveMemoryButton).toBeDisabled()
    expect(saveMemoryButton.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    expect(suggestions.getByRole("button", { name: "Dismiss" })).toBeDisabled()
  })

  it("groups suggestions into pending and resolved states", () => {
    const pendingCandidate: LearningCandidate = {
      id: "pending-suggestion",
      title: "Pending suggestion",
      content: "Review candidate before saving.",
      suggestionType: "memory",
      status: "suggested",
      confidence: 0.82,
      source: {
        threadId: "thread-creating-agent",
        threadTitle: "Creating Agent",
        agentId: "senior-reviewer",
        agentName: "Senior Reviewer",
      },
      provenance: {
        kind: "mocked-llm-derived",
        label: "Mocked LLM-derived seed",
      },
      createdBy: "seed",
      actions: [
        {
          id: "save-memory",
          label: "Save memory",
          tone: "primary",
          icon: "sparkles",
        },
        { id: "dismiss", label: "Dismiss", tone: "secondary" },
      ],
    }
    const resolvedCandidate: LearningCandidate = {
      ...pendingCandidate,
      id: "resolved-suggestion",
      title: "Resolved suggestion",
      status: "accepted",
      actions: [],
    }

    render(
      <LearningCandidatesSection
        candidates={[pendingCandidate, resolvedCandidate]}
      />
    )

    const suggestions = within(
      screen.getByRole("region", { name: "Suggestions" })
    )
    expect(
      suggestions.getByRole("heading", { name: "Pending" })
    ).toBeInTheDocument()
    expect(suggestions.getByText("Pending suggestion")).toBeInTheDocument()
    expect(
      suggestions.getByRole("heading", { name: "Resolved" })
    ).toBeInTheDocument()
    expect(suggestions.getByText("Resolved suggestion")).toBeInTheDocument()
    expect(suggestions.getAllByText("Resolved").length).toBeGreaterThanOrEqual(
      1
    )
  })

  it("does not render an orphaned suggestions section when there are no suggestions", () => {
    render(<LearningCandidatesSection candidates={[]} />)

    expect(
      screen.queryByRole("region", { name: "Suggestions" })
    ).not.toBeInTheDocument()
  })

  it("shows an empty-state label when no memories are saved", () => {
    render(
      <MemoryRouter>
        <LearningSecondaryPanel memories={[]} />
      </MemoryRouter>
    )

    expect(screen.getByText("0 saved")).toBeInTheDocument()
    expect(screen.getByText("No memories stored yet")).toBeInTheDocument()
  })

  it("navigates from Learning to Memories", async () => {
    const user = userEvent.setup()
    const memoriesResponse: MemoriesListResponse = {
      categories: [],
      memories: [],
    }
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => memoriesResponse,
      })
    )

    render(
      <MemoryRouter initialEntries={["/learning"]}>
        <Routes>
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
        </Routes>
      </MemoryRouter>
    )

    await user.click(screen.getByRole("link", { name: "Browse Memories" }))

    expect(
      screen.getByRole("heading", { name: "Memories" })
    ).toBeInTheDocument()
    expect(screen.getByText(/Browse saved context/)).toBeInTheDocument()
    expect(await screen.findByText("No saved memories")).toBeInTheDocument()
  })

  it("filters conversations by agent", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    const conversations = () =>
      within(screen.getByRole("region", { name: "Learning conversations" }))

    expect(
      conversations().getByRole("heading", { name: "Creating Agent" })
    ).toBeInTheDocument()
    expect(
      conversations().getByRole("heading", { name: "Editor gate review" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Senior Reviewer/i }))
    expect(
      conversations().getByRole("heading", { name: "Creating Agent" })
    ).toBeInTheDocument()
    expect(
      conversations().queryByRole("heading", { name: "Editor gate review" })
    ).not.toBeInTheDocument()
  })
})
