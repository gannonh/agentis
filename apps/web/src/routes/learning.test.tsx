import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
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
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThanOrEqual(1)
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
