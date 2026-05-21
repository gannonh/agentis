import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { AppSidebar } from "./app-sidebar"
import { vi } from "vitest"

vi.mock("@/lib/api/client", () => ({
  listThreads: vi.fn().mockResolvedValue([
    {
      id: "thread_demo",
      title: "Creating Agent",
      status: "active",
      model: "gpt-4o-mini",
      mode: "plan",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
}))

function renderSidebar(initialPath = "/threads/new") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>
  )
}

describe("AppSidebar", () => {
  it("renders primary navigation links", () => {
    renderSidebar()
    expect(screen.getByText("New thread")).toBeInTheDocument()
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.getByText("Library")).toBeInTheDocument()
    expect(screen.getByText("Learning")).toBeInTheDocument()
    expect(screen.getByText("Integrations")).toBeInTheDocument()
  })

  it("renders seeded agents and API thread labels", async () => {
    renderSidebar()
    expect(screen.getByText("Command Center")).toBeInTheDocument()
    expect(screen.getByText("Senior Reviewer")).toBeInTheDocument()
    expect(screen.getByText("Editor & Quality Gate")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText("Creating Agent")).toBeInTheDocument()
    })
  })

  it("does not show referral promo copy", () => {
    renderSidebar()
    expect(screen.queryByText(/referral/i)).not.toBeInTheDocument()
  })
})
