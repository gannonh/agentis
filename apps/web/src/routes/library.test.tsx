import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { getWorkspace } from "@/fixtures"
import { LibraryPage } from "./library"

describe("LibraryPage", () => {
  it("renders artifact grid from workspace fixtures", () => {
    const workspace = getWorkspace()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByLabelText("Search artifacts")).toBeDisabled()
    for (const artifact of workspace.artifacts) {
      expect(screen.getByText(artifact.title)).toBeInTheDocument()
    }
  })
})
