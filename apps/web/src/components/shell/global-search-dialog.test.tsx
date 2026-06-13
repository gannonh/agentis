import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GlobalSearchDialog } from "./global-search-dialog"
import { GlobalSearchProvider } from "@/components/shell/global-search-provider"

const { searchWorkspaceMock } = vi.hoisted(() => ({
  searchWorkspaceMock: vi.fn(),
}))

vi.mock("@/lib/api/search-client", () => ({
  searchWorkspace: searchWorkspaceMock,
}))

function renderDialog(initialPath = "/threads/new") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GlobalSearchProvider>
        <GlobalSearchDialog />
        <Routes>
          <Route path="/threads/:threadId" element={<div>Thread page</div>} />
        </Routes>
      </GlobalSearchProvider>
    </MemoryRouter>
  )
}

describe("GlobalSearchDialog", () => {
  beforeEach(() => {
    searchWorkspaceMock.mockReset()
  })

  it("shows grouped results and navigates on selection", async () => {
    searchWorkspaceMock.mockResolvedValue({
      query: "prospect",
      threads: [
        {
          id: "thread_1",
          title: "Prospect follow-up",
          subtitle: "Research Librarian",
          entityType: "thread",
        },
      ],
      artifacts: [],
      agents: [],
      projects: [],
    })

    renderDialog()

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    const input = await screen.findByPlaceholderText(
      "Search threads, library, agents, projects…"
    )
    fireEvent.change(input, { target: { value: "prospect" } })

    await waitFor(() => {
      expect(screen.getByText("Prospect follow-up")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Prospect follow-up"))

    await waitFor(() => {
      expect(screen.getByText("Thread page")).toBeInTheDocument()
    })
  })

  it("shows a human-readable empty state", async () => {
    searchWorkspaceMock.mockResolvedValue({
      query: "missing",
      threads: [],
      artifacts: [],
      agents: [],
      projects: [],
    })

    renderDialog()

    fireEvent.keyDown(window, { key: "k", metaKey: true })
    const input = await screen.findByPlaceholderText(
      "Search threads, library, agents, projects…"
    )
    fireEvent.change(input, { target: { value: "missing" } })

    await waitFor(() => {
      expect(screen.getByText('No results for “missing”.')).toBeInTheDocument()
    })
  })

  it("shows a human-readable error state", async () => {
    searchWorkspaceMock.mockRejectedValue(new Error("network down"))

    renderDialog()

    fireEvent.keyDown(window, { key: "k", metaKey: true })
    const input = await screen.findByPlaceholderText(
      "Search threads, library, agents, projects…"
    )
    fireEvent.change(input, { target: { value: "prospect" } })

    await waitFor(() => {
      expect(
        screen.getByText("Search is unavailable right now.")
      ).toBeInTheDocument()
    })
  })

  it("hides a stale error while a new query is pending", async () => {
    searchWorkspaceMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        query: "prospect",
        threads: [],
        artifacts: [],
        agents: [],
        projects: [],
      })

    renderDialog()

    fireEvent.keyDown(window, { key: "k", metaKey: true })
    const input = await screen.findByPlaceholderText(
      "Search threads, library, agents, projects…"
    )
    fireEvent.change(input, { target: { value: "broken" } })

    await waitFor(() => {
      expect(
        screen.getByText("Search is unavailable right now.")
      ).toBeInTheDocument()
    })

    fireEvent.change(input, { target: { value: "prospect" } })

    expect(
      screen.queryByText("Search is unavailable right now.")
    ).not.toBeInTheDocument()
  })

  it("clears stale results while the query changes", async () => {
    searchWorkspaceMock.mockImplementation(async (query: string) => {
      await new Promise((resolve) => window.setTimeout(resolve, 50))
      return {
        query,
        threads:
          query === "pros"
            ? [
                {
                  id: "thread_old",
                  title: "Old prospect thread",
                  subtitle: "Agent",
                  entityType: "thread",
                },
              ]
            : [
                {
                  id: "thread_new",
                  title: "New prospect thread",
                  subtitle: "Agent",
                  entityType: "thread",
                },
              ],
        artifacts: [],
        agents: [],
        projects: [],
      }
    })

    renderDialog()

    fireEvent.keyDown(window, { key: "k", metaKey: true })
    const input = await screen.findByPlaceholderText(
      "Search threads, library, agents, projects…"
    )

    fireEvent.change(input, { target: { value: "pros" } })
    await waitFor(() => {
      expect(screen.getByText("Old prospect thread")).toBeInTheDocument()
    })

    fireEvent.change(input, { target: { value: "prospect" } })
    expect(screen.queryByText("Old prospect thread")).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("New prospect thread")).toBeInTheDocument()
    })
  })
})
