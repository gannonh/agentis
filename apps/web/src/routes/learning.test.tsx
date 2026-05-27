import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { LearningCandidatesSection } from "@/components/learning/learning-candidates-section"
import { LearningPage } from "./learning"

describe("LearningPage", () => {
  it("renders learning dashboard aligned with comp", () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Learning" })).toBeInTheDocument()
    expect(screen.getByText("Your agents learn from conversations")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("2 pinned")).toBeInTheDocument()
    expect(screen.getByText("View all 15 skills →")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Memories" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Rubrics" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Creating Agent" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThanOrEqual(1)
  })

  it("renders mocked learning candidate metadata and actions", () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    const candidates = within(screen.getByRole("region", { name: "Learning candidates" }))

    expect(candidates.getByText("Capture review preference")).toBeInTheDocument()
    expect(candidates.getByText("Mocked LLM-derived seed")).toBeInTheDocument()
    expect(candidates.getByText("Creating Agent")).toBeInTheDocument()
    expect(candidates.getByText("Memory suggestion")).toBeInTheDocument()
    expect(candidates.getByText("82% confidence")).toBeInTheDocument()
    expect(candidates.getByText("Suggested")).toBeInTheDocument()

    const saveMemoryButton = candidates.getByRole("button", { name: "Save memory" })
    expect(saveMemoryButton).toBeDisabled()
    expect(saveMemoryButton.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(candidates.getByRole("button", { name: "Dismiss" })).toBeDisabled()
  })

  it("does not render an orphaned candidates section when there are no candidates", () => {
    render(<LearningCandidatesSection candidates={[]} />)

    expect(screen.queryByRole("region", { name: "Learning candidates" })).not.toBeInTheDocument()
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

    expect(conversations().getByText("Creating Agent")).toBeInTheDocument()
    expect(conversations().getByText("Editor gate review")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Senior Reviewer/i }))
    expect(conversations().getByText("Creating Agent")).toBeInTheDocument()
    expect(conversations().queryByText("Editor gate review")).not.toBeInTheDocument()
  })
})
