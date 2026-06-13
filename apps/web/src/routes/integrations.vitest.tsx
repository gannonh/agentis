import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { IntegrationsPage } from "./integrations"
import { listIntegrations } from "@/lib/api/client"

const mockToolkits = [
  {
    slug: "github",
    name: "GitHub",
    description: "Manage repos, issues, and pull requests.",
    category: "developer",
    featured: true,
    integrationType: "native" as const,
    status: "connected" as const,
    connectedAccountCount: 1,
    availableTools: ["GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER"],
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Send messages and read channel history.",
    category: "communication",
    featured: true,
    integrationType: "native" as const,
    status: "not_connected" as const,
    connectedAccountCount: 0,
    availableTools: ["SLACK_LIST_ALL_CHANNELS"],
  },
]

vi.mock("@/lib/api/client", () => ({
  listIntegrations: vi.fn(async () => ({
    toolkits: mockToolkits,
    categories: ["communication", "developer"],
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
    categories: ["communication", "developer"],
    composioConfigured: true,
    composioMockEnabled: true,
  })),
  resetIntegrationConnection: vi.fn(async () => undefined),
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
    expect(screen.queryByRole("note", { name: "Demo data notice" })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
    })
    expect(screen.getByRole("heading", { name: "Slack" })).toBeInTheDocument()
    expect(screen.getAllByText("NATIVE").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "developer" })).toBeInTheDocument()
  })

  it("debounces search requests to the integrations API", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(listIntegrations).toHaveBeenCalled()
    })

    await user.type(screen.getByRole("searchbox", { name: "Search integrations" }), "github")

    await waitFor(
      () => {
        expect(listIntegrations).toHaveBeenCalledWith(
          expect.objectContaining({ q: "github" })
        )
      },
      { timeout: 2_000 }
    )
  })

  it("keeps the latest search results when an earlier request resolves later", async () => {
    const user = userEvent.setup()
    let resolveInitial: (value: Awaited<ReturnType<typeof listIntegrations>>) => void
    const initial = new Promise<Awaited<ReturnType<typeof listIntegrations>>>(
      (resolve) => {
        resolveInitial = resolve
      }
    )
    vi.mocked(listIntegrations)
      .mockReturnValueOnce(initial)
      .mockResolvedValueOnce({
        toolkits: [mockToolkits[0]!],
        categories: ["developer"],
        composioConfigured: true,
        composioMockEnabled: true,
      })

    render(
      <MemoryRouter>
        <IntegrationsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(listIntegrations).toHaveBeenCalledTimes(1)
    })
    await user.type(screen.getByRole("searchbox", { name: "Search integrations" }), "git")
    await waitFor(() => {
      expect(listIntegrations).toHaveBeenCalledTimes(2)
      expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
    })

    await act(async () => {
      resolveInitial!({
        toolkits: [mockToolkits[1]!],
        categories: ["communication"],
        composioConfigured: true,
        composioMockEnabled: true,
      })
    })

    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Slack" })).not.toBeInTheDocument()
  })
})
