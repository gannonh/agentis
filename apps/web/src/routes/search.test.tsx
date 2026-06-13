import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { GlobalSearchProvider } from "@/components/shell/global-search-provider"
import { GlobalSearchDialog } from "@/components/shell/global-search-dialog"
import { SearchPage } from "./search"

describe("SearchPage", () => {
  it("renders search guidance and opens the palette", () => {
    render(
      <MemoryRouter>
        <GlobalSearchProvider>
          <SearchPage />
          <GlobalSearchDialog />
        </GlobalSearchProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("Search", { selector: "h1" })).toBeInTheDocument()
    expect(screen.getByText("Workspace search is open")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Search threads, library, agents, projects…")
    ).toBeInTheDocument()
  })
})
