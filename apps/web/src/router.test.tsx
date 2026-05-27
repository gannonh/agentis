import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RouterProvider, createMemoryRouter } from "react-router"
import { afterEach, vi } from "vitest"
import { router } from "@/router"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("router", () => {
  it("redirects / to new thread home inside the shell", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(screen.getByRole("link", { name: /Skip to main content/i })).toHaveAttribute(
      "href",
      "#main-content"
    )
    expect(
      await screen.findByRole("heading", { name: "Let's get to work." })
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
    })
  })

  it("renders memories route with saved memory card metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          categories: [
            {
              id: "memory_category_project_context",
              name: "Project Context",
              description: "Durable project context.",
              count: 1,
            },
          ],
          memories: [
            {
              id: "memory_seed_agentis_m07",
              content: "Agentis is adding a Memories foundation.",
              category: "Project Context",
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
            },
          ],
        }),
      })
    )
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/memories"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(await screen.findByRole("heading", { name: "Memories" })).toBeInTheDocument()
    expect(screen.getByText("Agentis is adding a Memories foundation.")).toBeInTheDocument()
    expect(screen.getByText("Use when explaining the M07 Memories work.")).toBeInTheDocument()
    expect(screen.getByText("Senior Reviewer")).toBeInTheDocument()
    expect(screen.getByText("mocked seed memory from the M07 planning artifacts")).toBeInTheDocument()
  })

  it("filters memories by category and keeps empty categories visible", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          categories: [
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
          ],
          memories: [
            {
              id: "memory_seed_agentis_m07",
              content: "Agentis is adding a Memories foundation.",
              category: "Project Context",
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
            },
          ],
        }),
      })
    )
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/memories"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(await screen.findByRole("button", { name: /People 0 saved/i })).toBeEnabled()
    await user.click(screen.getByRole("button", { name: /People 0 saved/i }))

    expect(screen.getByText("No memories in People")).toBeInTheDocument()
    expect(
      screen.queryByText("Agentis is adding a Memories foundation.")
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Project Context 1 saved/i }))

    expect(screen.getByText("Agentis is adding a Memories foundation.")).toBeInTheDocument()
    expect(
      screen.getByText("mocked seed memory from the M07 planning artifacts")
    ).toBeInTheDocument()
  })

  it("renders not found for unknown paths", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/does-not-exist"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument()
  })
})
