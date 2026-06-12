import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, vi } from "vitest"
import type { MemoriesListResponse } from "@workspace/shared"
import { LearningCandidatesSection } from "@/components/learning/learning-candidates-section"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import type { LearningCandidate } from "@/fixtures/schema"
import { LearningPage } from "./learning"
import { MemoriesPage } from "./memories"

const LEARNING_SCOPE_INTERACTION_TIMEOUT_MS = 30_000

const EMPTY_LEARNING_SUMMARY = {
  skillsCount: 0,
  pinnedSkillsCount: 0,
  memoriesCount: 0,
  rubricsCount: 0,
  pendingSuggestionsCount: 0,
}

const EMPTY_LEARNING_SKILLS = {
  skills: [],
  page: 1,
  pageSize: 5,
  totalCount: 0,
  totalPages: 0,
}

const EMPTY_LEARNING_SUGGESTIONS = {
  suggestions: [],
  page: 1,
  pageSize: 100,
  totalCount: 0,
  totalPages: 0,
}

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

function fetchResponse(data: unknown, fallback: unknown) {
  if (data instanceof Error) {
    return Promise.reject(data)
  }
  return jsonResponse(data ?? fallback)
}

const EMPTY_LEARNING_MEMORIES = {
  page: 1,
  pageSize: 100,
  totalCount: 0,
  totalPages: 0,
  categories: [],
  memories: [],
}

function withLearningMemoriesResponse(memories: {
  categories?: unknown[]
  memories?: unknown[]
}) {
  const items = memories.memories ?? []
  return {
    ...EMPTY_LEARNING_MEMORIES,
    ...memories,
    totalCount: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  }
}

function stubLearningFetch(
  handlers: {
    threads?: unknown
    memories?: unknown
    summary?: unknown
    skills?: unknown
    agents?: unknown
  } = {}
) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/threads")) {
        return fetchResponse(handlers.threads, [])
      }
      if (url.startsWith("/api/learning/memories")) {
        const memories =
          handlers.memories && typeof handlers.memories === "object"
            ? withLearningMemoriesResponse(
                handlers.memories as {
                  categories?: unknown[]
                  memories?: unknown[]
                }
              )
            : EMPTY_LEARNING_MEMORIES
        return fetchResponse(memories, EMPTY_LEARNING_MEMORIES)
      }
      if (url.endsWith("/api/learning/summary")) {
        return fetchResponse(handlers.summary, EMPTY_LEARNING_SUMMARY)
      }
      if (url.startsWith("/api/learning/skills")) {
        return fetchResponse(handlers.skills, EMPTY_LEARNING_SKILLS)
      }
      if (url.startsWith("/api/learning/suggestions")) {
        return fetchResponse(handlers.suggestions, EMPTY_LEARNING_SUGGESTIONS)
      }
      if (url.endsWith("/api/agents")) {
        return fetchResponse(handlers.agents, [])
      }
      return jsonResponse({})
    })
  )
}

describe("LearningPage", () => {
  it("expands API-backed threads with no linked memory candidates", async () => {
    const user = userEvent.setup()
    stubLearningFetch({
      threads: [
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
      ],
    })

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
    stubLearningFetch({
      threads: [
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
      ],
      memories: {
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
      },
      summary: {
        skillsCount: 0,
        pinnedSkillsCount: 0,
        memoriesCount: 1,
        rubricsCount: 0,
        pendingSuggestionsCount: 0,
      },
      agents: [
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
      ],
    })

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
    stubLearningFetch({
      threads: [
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
      ],
      memories: {
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
      },
      summary: {
        skillsCount: 0,
        pinnedSkillsCount: 0,
        memoriesCount: 1,
        rubricsCount: 0,
        pendingSuggestionsCount: 0,
      },
    })

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
  }, LEARNING_SCOPE_INTERACTION_TIMEOUT_MS)

  it("preserves conversations and memories when secondary learning requests fail", async () => {
    stubLearningFetch({
      threads: [
        {
          id: "thread_secondary_failure",
          title: "Secondary request failure",
          status: "finished",
          model: "gpt-4o-mini",
          mode: "agent",
          agentId: "agent_research",
          agentNameSnapshot: "Research Agent",
          createdAt: "2026-05-15T15:30:00.000Z",
          updatedAt: "2026-05-21T15:30:00.000Z",
          messageCount: 2,
        },
      ],
      memories: {
        categories: [],
        memories: [
          {
            id: "memory_secondary_failure",
            content: "Prefer source-backed answers.",
            category: "memory_category_preference",
            usageGuidance: "Use when researching.",
            tags: [],
            importance: "medium",
            date: "2026-05-22",
            scope: "agent",
            associatedAgent: "agent_research",
            associatedAgents: ["agent_research"],
            source: "thread-derived",
            sourceThreadId: "thread_secondary_failure",
            sourceThreadTitle: "Secondary request failure",
            provenance: "Accepted from Secondary request failure",
            pinnedToContext: true,
            createdAt: "2026-05-22T15:30:00.000Z",
            updatedAt: "2026-05-22T15:30:00.000Z",
          },
        ],
      },
      summary: new Error("summary unavailable"),
      skills: new Error("skills unavailable"),
    })

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole("heading", { name: "Secondary request failure" })
    ).toBeInTheDocument()
    expect(screen.getByText("1 saved")).toBeInTheDocument()
    expect(screen.getByText("Skills could not load.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Learning totals could not load"
    )
    expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument()
  })

  it("derives pinned skill counts when summary fails but skills load", async () => {
    stubLearningFetch({
      summary: new Error("summary unavailable"),
      skills: {
        skills: [
          {
            id: "skill_pinned",
            name: "website-to-hyperframes",
            description: null,
            pinned: true,
            agentId: null,
            createdAt: "2026-06-09T00:00:00.000Z",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
        ],
        page: 1,
        pageSize: 5,
        totalCount: 1,
        totalPages: 1,
      },
    })

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(await screen.findByText("0 pinned")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Learning totals could not load"
    )
  })

  it("renders API-backed empty states on a fresh install", async () => {
    stubLearningFetch()

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
      screen.queryByRole("note", { name: "Demo data notice" })
    ).not.toBeInTheDocument()
    expect(
      await screen.findByText("Your agents learn from conversations")
    ).toBeInTheDocument()
    expect(screen.getByText("What agents can learn")).toBeInTheDocument()
    expect(screen.getByText(/Skills — Reusable techniques/)).toBeInTheDocument()
    expect(
      screen.getByText(/Memories — Facts and preferences/)
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    expect(screen.getByText("No skills stored yet")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText("0 pinned")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Memories" })
    ).toBeInTheDocument()
    expect(screen.getByText("0 saved")).toBeInTheDocument()
    expect(screen.getByText("No memories stored yet")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Rubrics" })).toBeInTheDocument()
    expect(screen.getByText("No rubrics yet")).toBeInTheDocument()
    expect(
      await screen.findByText("No conversations yet")
    ).toBeInTheDocument()
  })

  it("renders populated skills from the learning API", async () => {
    stubLearningFetch({
      summary: {
        skillsCount: 2,
        pinnedSkillsCount: 1,
        memoriesCount: 0,
        rubricsCount: 0,
        pendingSuggestionsCount: 0,
      },
      skills: {
        skills: [
          {
            id: "skill_1",
            name: "website-to-hyperframes",
            description: null,
            pinned: true,
            agentId: null,
            createdAt: "2026-06-09T00:00:00.000Z",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
          {
            id: "skill_2",
            name: "video-prompting",
            description: null,
            pinned: false,
            agentId: null,
            createdAt: "2026-06-09T00:00:00.000Z",
            updatedAt: "2026-06-09T00:00:00.000Z",
          },
        ],
        page: 1,
        pageSize: 5,
        totalCount: 2,
        totalPages: 1,
      },
    })

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(await screen.findByText("website-to-hyperframes")).toBeInTheDocument()
    expect(screen.getByText("video-prompting")).toBeInTheDocument()
    expect(screen.getByText("View all 2 skills →")).toBeInTheDocument()
    expect(screen.getByText("1 pinned")).toBeInTheDocument()
  })

  it("accepts a pending suggestion from the learning API", async () => {
    const user = userEvent.setup()
    const pendingSuggestion = {
      id: "learning_suggestion_pending",
      status: "pending",
      suggestionType: "memory",
      title: "Capture preference",
      content: "Prefer concise summaries.",
      confidence: 0.82,
      sourceThreadId: "thread-creating-agent",
      sourceThreadTitle: "Creating Agent",
      agentId: "senior-reviewer",
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z",
    }
    const acceptedSuggestion = {
      ...pendingSuggestion,
      status: "accepted",
      updatedAt: "2026-06-09T00:00:01.000Z",
    }

    let suggestionState = pendingSuggestion

    stubLearningFetch({
      threads: [
        {
          id: "thread-creating-agent",
          title: "Creating Agent",
          status: "finished",
          model: "gpt-4o-mini",
          mode: "agent",
          agentId: "senior-reviewer",
          agentNameSnapshot: "Senior Reviewer",
          createdAt: "2026-05-15T15:30:00.000Z",
          updatedAt: "2026-05-21T15:30:00.000Z",
          messageCount: 2,
        },
      ],
      suggestions: {
        suggestions: [pendingSuggestion],
        page: 1,
        pageSize: 100,
        totalCount: 1,
        totalPages: 1,
      },
    })

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (
        url.includes("/api/learning/suggestions/learning_suggestion_pending/accept") &&
        init?.method === "POST"
      ) {
        suggestionState = acceptedSuggestion
        return jsonResponse({
          suggestion: acceptedSuggestion,
          savedMemoryId: "memory_accepted",
        })
      }
      if (url.startsWith("/api/learning/suggestions")) {
        return jsonResponse({
          suggestions: [suggestionState],
          page: 1,
          pageSize: 100,
          totalCount: 1,
          totalPages: 1,
        })
      }
      if (url.endsWith("/api/threads")) {
        return jsonResponse([
          {
            id: "thread-creating-agent",
            title: "Creating Agent",
            status: "finished",
            model: "gpt-4o-mini",
            mode: "agent",
            agentId: "senior-reviewer",
            agentNameSnapshot: "Senior Reviewer",
            createdAt: "2026-05-15T15:30:00.000Z",
            updatedAt: "2026-05-21T15:30:00.000Z",
            messageCount: 2,
          },
        ])
      }
      if (url.startsWith("/api/learning/memories")) {
        return jsonResponse(EMPTY_LEARNING_MEMORIES)
      }
      if (url.endsWith("/api/learning/summary")) {
        return jsonResponse(EMPTY_LEARNING_SUMMARY)
      }
      if (url.startsWith("/api/learning/skills")) {
        return jsonResponse(EMPTY_LEARNING_SKILLS)
      }
      return jsonResponse({})
    })

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    await user.click(
      await screen.findByRole("button", {
        name: "Expand Creating Agent",
      })
    )
    const suggestions = within(
      screen.getByRole("region", { name: "Suggestions" })
    )
    await user.click(
      suggestions.getByRole("button", { name: "Save memory" })
    )

    expect(
      await screen.findByRole("heading", { name: "Resolved" })
    ).toBeInTheDocument()
    expect(screen.getAllByText("Resolved").length).toBeGreaterThanOrEqual(1)
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
        <LearningSecondaryPanel memories={[]} rubricsCount={0} />
      </MemoryRouter>
    )

    expect(screen.getByText("0 saved")).toBeInTheDocument()
    expect(screen.getByText("No memories stored yet")).toBeInTheDocument()
    expect(screen.getByText("No rubrics yet")).toBeInTheDocument()
  })

  it("navigates from Learning to Memories", async () => {
    const user = userEvent.setup()
    const memoriesResponse: MemoriesListResponse = {
      categories: [],
      memories: [],
    }
    stubLearningFetch()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/memories")) {
        return jsonResponse(memoriesResponse)
      }
      if (url.endsWith("/api/threads")) {
        return jsonResponse([])
      }
      if (url.endsWith("/api/learning/summary")) {
        return jsonResponse(EMPTY_LEARNING_SUMMARY)
      }
      if (url.startsWith("/api/learning/skills")) {
        return jsonResponse(EMPTY_LEARNING_SKILLS)
      }
      return jsonResponse({})
    })

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
    stubLearningFetch({
      threads: [
        {
          id: "thread-creating-agent",
          title: "Creating Agent",
          status: "finished",
          model: "gpt-4o-mini",
          mode: "agent",
          agentId: "senior-reviewer",
          agentNameSnapshot: "Senior Reviewer",
          createdAt: "2026-05-15T15:30:00.000Z",
          updatedAt: "2026-05-21T15:30:00.000Z",
          messageCount: 2,
        },
        {
          id: "thread-editor-gate",
          title: "Editor gate review",
          status: "finished",
          model: "gpt-4o-mini",
          mode: "agent",
          agentId: "editor-gate",
          agentNameSnapshot: "Editor Gate",
          createdAt: "2026-05-15T15:30:00.000Z",
          updatedAt: "2026-05-21T15:30:00.000Z",
          messageCount: 2,
        },
      ],
    })

    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    const conversations = () =>
      within(screen.getByRole("region", { name: "Learning conversations" }))

    expect(
      await conversations().findByRole("heading", { name: "Creating Agent" })
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

  it("focuses a pending suggestion from Command Center deep links", async () => {
    const pendingSuggestion = {
      id: "learning_suggestion_pending",
      status: "pending",
      suggestionType: "memory",
      title: "Review conversation insight",
      content: "Conversation takeaway: Fleet observability is confirmed.",
      confidence: 0.82,
      sourceThreadId: "thread-creating-agent",
      sourceThreadTitle: "Creating Agent",
      agentId: "senior-reviewer",
      createdAt: "2026-06-09T00:00:00.000Z",
      updatedAt: "2026-06-09T00:00:00.000Z",
    }

    stubLearningFetch({
      threads: [
        {
          id: "thread-creating-agent",
          title: "Creating Agent",
          status: "finished",
          model: "gpt-4o-mini",
          mode: "agent",
          agentId: "senior-reviewer",
          agentNameSnapshot: "Senior Reviewer",
          createdAt: "2026-05-15T15:30:00.000Z",
          updatedAt: "2026-05-21T15:30:00.000Z",
          messageCount: 2,
        },
      ],
      suggestions: {
        suggestions: [pendingSuggestion],
        page: 1,
        pageSize: 100,
        totalCount: 1,
        totalPages: 1,
      },
    })

    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    render(
      <MemoryRouter
        initialEntries={[
          "/learning?status=pending&suggestionId=learning_suggestion_pending",
        ]}
      >
        <Routes>
          <Route path="/learning" element={<LearningPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByTestId("learning-review-focus-banner")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Save memory" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Collapse Creating Agent" })
    ).toBeInTheDocument()
    expect(
      document.getElementById("learning-suggestion-learning_suggestion_pending")
    ).toBeTruthy()
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled()
    })
  })

  it("shows a missing suggestion banner for stale deep links", async () => {
    stubLearningFetch({
      threads: [],
      suggestions: EMPTY_LEARNING_SUGGESTIONS,
    })

    render(
      <MemoryRouter
        initialEntries={[
          "/learning?status=pending&suggestionId=learning_suggestion_missing",
        ]}
      >
        <Routes>
          <Route path="/learning" element={<LearningPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(
      await screen.findByTestId("learning-review-focus-missing-banner")
    ).toBeInTheDocument()
    expect(screen.getByText(/learning_suggestion_missing/)).toBeInTheDocument()
  })
})
