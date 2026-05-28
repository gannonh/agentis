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
})

describe("LearningPage", () => {
  it("renders learning dashboard aligned with comp", () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: "Learning" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Your agents learn from conversations")
    ).toBeInTheDocument()
    expect(screen.getByText("What agents can learn")).toBeInTheDocument()
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
    expect(suggestions.getByText("Creating Agent")).toBeInTheDocument()
    expect(suggestions.getByText("Memory suggestion")).toBeInTheDocument()
    expect(suggestions.getByText("82% confidence")).toBeInTheDocument()
    expect(
      suggestions.getByRole("heading", { name: "Pending" })
    ).toBeInTheDocument()
    expect(suggestions.getAllByText("Pending").length).toBeGreaterThanOrEqual(1)

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
