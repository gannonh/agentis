import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ProjectCreatePage } from "./project-create"

const navigate = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock("@/lib/api/projects-client", () => ({
  createProject: vi.fn().mockResolvedValue({
    id: "project_test",
    name: "Launch",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
}))

describe("ProjectCreatePage", () => {
  beforeEach(() => {
    navigate.mockReset()
  })

  it("creates a project and redirects to new thread with project selected", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ProjectCreatePage />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/project name/i), "Launch")
    await user.click(screen.getByRole("button", { name: /create project/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "/threads/new?projectId=project_test"
      )
    })
  })
})
