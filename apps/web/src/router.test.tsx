import { render, screen, waitFor } from "@testing-library/react"
import { RouterProvider, createMemoryRouter } from "react-router"
import { router } from "@/router"

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

  it("renders the Memories route", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/memories"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(await screen.findByRole("heading", { name: "Memories" })).toBeInTheDocument()
  })

  it("renders not found for unknown paths", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/does-not-exist"],
    })

    render(<RouterProvider router={memoryRouter} />)

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument()
  })
})
