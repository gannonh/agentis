import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { SearchPage } from "./search"

describe("SearchPage", () => {
  it("renders search placeholder", () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument()
    expect(screen.getByText("Search is coming soon")).toBeInTheDocument()
  })
})
