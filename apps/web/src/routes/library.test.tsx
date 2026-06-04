import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { listThreads } from "@/lib/api/client"
import { listAgents } from "@/lib/api/agents-client"
import { listDocuments, listProjects } from "@/lib/api/projects-client"
import { LibraryPage } from "./library"

vi.mock("@/lib/api/client", () => ({
  listThreads: vi.fn().mockResolvedValue([
    {
      id: "thread_launch",
      title: "Launch evidence thread",
      status: "active",
      mode: "agent",
      model: "gpt-4o-mini",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "thread_research",
      title: "Research notes thread",
      status: "active",
      mode: "agent",
      model: "gpt-4o-mini",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
}))

vi.mock("@/lib/api/agents-client", () => ({
  listAgents: vi.fn().mockResolvedValue([
    {
      id: "agent_docs",
      name: "Docs Agent",
      status: "active",
      model: "gpt-4o-mini",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      libraryCount: 1,
      memoryCount: 0,
      integrationCount: 0,
      recentRunCount: 0,
    },
  ]),
}))

vi.mock("@/lib/api/projects-client", () => ({
  listDocuments: vi.fn().mockResolvedValue([
    {
      id: "document_test",
      title: "Q2 Brief",
      documentType: "markdown",
      mimeType: "text/plain",
      sizeBytes: 120,
      storageKey: "documents/test.txt",
      projectNameSnapshot: "Launch",
      createdAt: new Date().toISOString(),
      visibilityScope: "global",
      updatedAt: new Date().toISOString(),
    },
  ]),
  listProjects: vi.fn().mockResolvedValue([
    {
      id: "project_launch",
      name: "Launch",
      status: "active",
      goals: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
  uploadDocument: vi.fn(),
  getDocumentDetail: vi.fn(),
  downloadDocumentFile: vi.fn(),
  documentDownloadUrl: (id: string) => `/api/documents/${id}/download`,
  documentWorkspacePath: (id: string) => `/documents/${id}`,
}))

const mockedListDocuments = vi.mocked(listDocuments)
const mockedListProjects = vi.mocked(listProjects)
const mockedListAgents = vi.mocked(listAgents)
const mockedListThreads = vi.mocked(listThreads)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("LibraryPage", () => {
  it("renders API-backed document cards", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByLabelText("Search documents")).toBeEnabled()
    expect(screen.getByLabelText("Filter by type")).toHaveTextContent("All types")

    await waitFor(() => {
      expect(screen.getByText("Q2 Brief")).toBeInTheDocument()
    })
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/documents/document_test"
    )
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled()
  })

  it("filters documents by source and scope without listing threads in the main scope dropdown", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenCalled()
    })
    expect(mockedListProjects).toHaveBeenCalledWith(true)
    expect(mockedListAgents).toHaveBeenCalled()
    expect(mockedListThreads).toHaveBeenCalled()

    await user.click(screen.getByLabelText("Filter by source"))
    await user.click(await screen.findByRole("menuitemradio", { name: /Docs Agent/ }))
    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenLastCalledWith(
        expect.objectContaining({ source: "agent", agentId: "agent_docs" })
      )
    })

    const scope = screen.getByLabelText("Filter by scope")
    expect(scope).toHaveTextContent("Any scope")
    expect(scope).not.toHaveTextContent("Launch evidence thread")
    expect(screen.queryByLabelText("Filter by thread")).not.toBeInTheDocument()

    await user.click(scope)
    expect(screen.getByRole("menu", { hidden: true })).not.toHaveTextContent(
      "Launch evidence thread"
    )
    await user.click(screen.getByRole("menuitemradio", { name: /Launch/ }))
    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenLastCalledWith(
        expect.objectContaining({
          source: "agent",
          agentId: "agent_docs",
          visibilityScope: "project",
          projectId: "project_launch",
        })
      )
    })

  })

  it("shows a searchable thread filter only after selecting thread scope", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenCalled()
    })
    expect(screen.queryByLabelText("Filter by thread")).not.toBeInTheDocument()

    await user.click(screen.getByLabelText("Filter by scope"))
    await user.click(await screen.findByRole("menuitemradio", { name: /^Threads$/ }))
    expect(await screen.findByLabelText("Search threads")).toBeInTheDocument()
    expect(screen.getByLabelText("Filter by thread")).toHaveTextContent(
      "Launch evidence thread"
    )

    await user.type(screen.getByLabelText("Search threads"), "Research")
    expect(screen.getByLabelText("Filter by thread")).not.toHaveTextContent(
      "Launch evidence thread"
    )
    await user.selectOptions(screen.getByLabelText("Filter by thread"), "thread_research")
    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibilityScope: "thread",
          threadId: "thread_research",
        })
      )
    })
  })
})
