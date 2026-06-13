import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { GlobalSearchProvider } from "@/components/shell/global-search-provider"
import { GlobalSearchDialog } from "@/components/shell/global-search-dialog"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { SearchPage } from "./search"

vi.mock("@/lib/api/search-client", () => ({
  searchWorkspace: vi.fn(async (query: string) => ({
    query,
    threads: [],
    artifacts: [],
    agents: [],
    projects: [],
  })),
}))

function SearchOpenProbe() {
  const { open } = useGlobalSearch()
  return <div>{open ? "open" : "closed"}</div>
}

function SearchHarness({ showSearchPage }: { showSearchPage: boolean }) {
  return (
    <>
      <GlobalSearchDialog />
      <SearchOpenProbe />
      {showSearchPage ? <SearchPage /> : <div>Other page</div>}
    </>
  )
}

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

  it("closes the palette when leaving the search page", () => {
    const { rerender } = render(
      <MemoryRouter>
        <GlobalSearchProvider>
          <SearchHarness showSearchPage />
        </GlobalSearchProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("open")).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <GlobalSearchProvider>
          <SearchHarness showSearchPage={false} />
        </GlobalSearchProvider>
      </MemoryRouter>
    )

    expect(screen.getByText("Other page")).toBeInTheDocument()
    expect(screen.getByText("closed")).toBeInTheDocument()
  })

  it("clears the search query when leaving the search page", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <GlobalSearchProvider>
          <SearchHarness showSearchPage />
        </GlobalSearchProvider>
      </MemoryRouter>
    )

    const input = screen.getByPlaceholderText(
      "Search threads, library, agents, projects…"
    )
    fireEvent.change(input, { target: { value: "prospect" } })
    expect(input).toHaveValue("prospect")

    rerender(
      <MemoryRouter>
        <GlobalSearchProvider>
          <SearchHarness showSearchPage={false} />
        </GlobalSearchProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("closed")).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    expect(
      screen.getByPlaceholderText("Search threads, library, agents, projects…")
    ).toHaveValue("")
  })
})
