import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { CommandCenterPage } from "./command-center"

describe("CommandCenterPage", () => {
  it("shows command center metrics from fixtures", () => {
    render(
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("heading", { name: "Command Center" })
    ).toBeInTheDocument()
    expect(screen.getByText("Agents")).toBeInTheDocument()
    expect(screen.getByText("Total runs")).toBeInTheDocument()
    expect(screen.getByText("Senior Reviewer")).toBeInTheDocument()
    expect(screen.getByText("Editor & Quality Gate")).toBeInTheDocument()
    expect(screen.getByText("Repurpose Engine")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Agent roster" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Needs attention" })).toBeInTheDocument()
    expect(screen.getByText("1 pending improvement")).toBeInTheDocument()
    expect(screen.getByText("New Rubric")).toBeInTheDocument()
    expect(screen.getByText("Creating Agent")).toBeInTheDocument()
  })
})
