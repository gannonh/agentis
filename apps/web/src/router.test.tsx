import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RouterProvider, createMemoryRouter } from "react-router"
import { afterEach, vi } from "vitest"
import type { MemoriesListResponse } from "@workspace/shared"
import { router } from "@/router"

const ORIGINAL_TZ = process.env.TZ

const seededMemory: MemoriesListResponse["memories"][number] = {
  id: "memory_seed_agentis_m07",
  content: "Agentis is adding a Memories foundation.",
  category: "memory_category_project_context",
  usageGuidance: "Use when explaining the M07 Memories work.",
  tags: ["agentis", "memories"],
  importance: "high",
  date: "2026-05-27",
  scope: "project",
  associatedAgent: "Senior Reviewer",
  source: "seeded",
  provenance: "mocked seed memory from the M07 planning artifacts",
  createdAt: "2026-05-27T00:00:00.000Z",
  updatedAt: "2026-05-27T00:00:00.000Z",
}

function stubMemoriesFetch(
  response:
    | MemoriesListResponse
    | ((url: string) => MemoriesListResponse | Promise<MemoriesListResponse>)
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()
      const payload =
        typeof response === "function" ? await response(url) : response
      return {
        ok: true,
        json: async () => payload,
      }
    })
  )
}

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.restoreAllMocks()
})

describe("router", () => {
  it("redirects / to new thread home inside the shell", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(
      screen.getByRole("link", { name: /Skip to main content/i })
    ).toHaveAttribute("href", "#main-content")
    expect(
      await screen.findByRole("heading", { name: "Let's get to work." })
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
    })
  })

  it("renders memories route with saved memory card metadata", async () => {
    process.env.TZ = "America/Los_Angeles"
    stubMemoriesFetch({
      categories: [
        {
          id: "memory_category_project_context",
          name: "Project Context",
          description: "Durable project context.",
          count: 1,
        },
      ],
      memories: [seededMemory],
    })
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/memories"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(
      await screen.findByRole("heading", { name: "Memories" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Dedupe Memories" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add Memory" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("switch", { name: "Show archived" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "All Memories" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /All categories/i })
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Search memories...")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Agentis is adding a Memories foundation.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Use when explaining the M07 Memories work.")
    ).toBeInTheDocument()
    expect(screen.getByText("May 27, 2026")).toBeInTheDocument()
    expect(screen.getByText("Senior Reviewer")).toBeInTheDocument()
    expect(
      screen.getByText("mocked seed memory from the M07 planning artifacts")
    ).toBeInTheDocument()
  })

  it("filters memories through the category menu and keeps empty categories visible", async () => {
    const user = userEvent.setup()
    const categories: MemoriesListResponse["categories"] = [
      {
        id: "memory_category_project_context",
        name: "Project Context",
        description: "Durable project context.",
        count: 1,
      },
      {
        id: "memory_category_people",
        name: "People",
        description: "Stakeholder notes.",
        count: 0,
      },
    ]
    let resolvePeople: ((response: MemoriesListResponse) => void) | undefined
    stubMemoriesFetch((url) => {
      if (url.includes("category=memory_category_people")) {
        return new Promise<MemoriesListResponse>((resolve) => {
          resolvePeople = resolve
        })
      }

      return { categories, memories: [seededMemory] }
    })
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/memories"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(
      await screen.findByRole("button", { name: /All categories/i })
    ).toBeEnabled()
    await user.click(screen.getByRole("button", { name: /All categories/i }))

    const peopleItem = await screen.findByRole("menuitemradio", {
      name: /People \(0\)/i,
    })
    expect(peopleItem.querySelector("svg")).toBeInTheDocument()
    await user.click(peopleItem)

    expect(screen.getByText("Loading memories…")).toBeInTheDocument()
    expect(
      screen.queryByText("Agentis is adding a Memories foundation.")
    ).not.toBeInTheDocument()

    resolvePeople?.({ categories, memories: [] })
    expect(await screen.findByText("No memories in People")).toBeInTheDocument()

    expect(
      screen.getByRole("button", { name: /People \(0\)/i })
    ).toBeInTheDocument()
  })

  it("renders not found for unknown paths", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/does-not-exist"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(
      await screen.findByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument()
  })
})
