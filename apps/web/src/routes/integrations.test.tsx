import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { IntegrationsPage } from "./integrations"

describe("IntegrationsPage", () => {
  it("renders integrations catalog aligned with comp", () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Back to Settings")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument()
    expect(
      screen.getByText("Connect services and data warehouses for your agent.")
    ).toBeInTheDocument()
    expect(screen.getByText("Successfully connected Google Drive!")).toBeInTheDocument()
    expect(screen.getByText("Agent tools")).toBeInTheDocument()
    expect(screen.getByText("Invocations")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Connection Status" })).toBeInTheDocument()
    expect(screen.getByText("2 connected")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Google Drive" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Featured" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Manage" })).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Configure" })).toBeInTheDocument()
  })

  it("filters featured integrations by search", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Slack" })).toBeInTheDocument()
    await user.type(screen.getByRole("searchbox", { name: "Search integrations" }), "github")
    expect(screen.queryByRole("heading", { name: "Slack" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
  })
})
