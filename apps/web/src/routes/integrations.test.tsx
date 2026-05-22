import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IntegrationsPage } from "./integrations"

const mockToolkits = [
  {
    slug: "github",
    name: "GitHub",
    description: "Manage repos, issues, and pull requests.",
    category: "developer",
    featured: true,
    status: "connected" as const,
    connectedAccountCount: 1,
    availableTools: ["GITHUB_LIST_REPOSITORIES_FOR_AUTHENTICATED_USER"],
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Send messages and read channel history.",
    category: "communication",
    featured: true,
    status: "not_connected" as const,
    connectedAccountCount: 0,
    availableTools: ["SLACK_LIST_CHANNELS"],
  },
]

vi.mock("@/lib/api/client", () => ({
  listIntegrations: vi.fn(async () => ({
    toolkits: mockToolkits,
    composioConfigured: true,
    composioMockEnabled: true,
  })),
  connectIntegration: vi.fn(async () => ({
    connection: {
      id: "conn-1",
      toolkitSlug: "slack",
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    redirectUrl: "http://127.0.0.1:3001/api/integrations/callback?mock=1",
  })),
  refreshIntegrations: vi.fn(async () => ({
    toolkits: mockToolkits,
  })),
}))

describe("IntegrationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders API-backed integrations catalog", async () => {
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
    })
    expect(screen.getByRole("heading", { name: "Slack" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled()
  })

  it("filters featured integrations by search", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Slack" })).toBeInTheDocument()
    })
    await user.type(screen.getByRole("searchbox", { name: "Search integrations" }), "github")
    expect(screen.queryByRole("heading", { name: "Slack" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
  })
})
