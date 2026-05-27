import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import { LearningPage } from "./learning"
import { MemoriesPage } from "./memories"

describe("LearningPage", () => {
  it("renders learning dashboard aligned with comp", () => {
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Learning" })).toBeInTheDocument()
    expect(screen.getByText("Your agents learn from conversations")).toBeInTheDocument()
    expect(screen.getByText("What agents can learn")).toBeInTheDocument()
    expect(screen.getByText(/Skills — Reusable techniques/)).toBeInTheDocument()
    expect(screen.getByText(/Memories — Facts and preferences/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("2 pinned")).toBeInTheDocument()
    expect(screen.getByText("View all 15 skills →")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Memories" })).toBeInTheDocument()
    expect(screen.getByText("3 saved")).toBeInTheDocument()
    expect(screen.getByText("User Fact: 1")).toBeInTheDocument()
    expect(screen.getByText("Preference: 1")).toBeInTheDocument()
    expect(screen.getByText("Active Work: 1")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Rubrics" })).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThanOrEqual(1)
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
    render(
      <MemoryRouter initialEntries={["/learning"]}>
        <Routes>
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
        </Routes>
      </MemoryRouter>
    )

    await user.click(screen.getByRole("link", { name: "Browse Memories" }))

    expect(screen.getByRole("heading", { name: "Memories" })).toBeInTheDocument()
    expect(screen.getByText("Detailed memory browsing is coming soon.")).toBeInTheDocument()
  })

  it("filters conversations by agent", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LearningPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getByText("Editor gate review")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Senior Reviewer/i }))
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.queryByText("Editor gate review")).not.toBeInTheDocument()
  })
})
