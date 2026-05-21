import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ProjectCreatePage } from "./project-create"

describe("ProjectCreatePage", () => {
  it("gates create until project name is entered", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ProjectCreatePage />
      </MemoryRouter>
    )

    expect(screen.getByRole("button", { name: "Create project" })).toBeDisabled()
    await user.type(screen.getByLabelText(/Project name/i), "Launch Q2")
    expect(screen.getByRole("button", { name: "Create project" })).toBeEnabled()
  })

  it("links cancel back to new thread", () => {
    render(
      <MemoryRouter>
        <ProjectCreatePage />
      </MemoryRouter>
    )

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/threads/new"
    )
  })
})
