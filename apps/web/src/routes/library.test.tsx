import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { listThreads } from "@/lib/api/client"
import { listAgents } from "@/lib/api/agents-client"
import {
  listArtifacts,
  listProjects,
  uploadDocument,
} from "@/lib/api/projects-client"
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
  listArtifacts: vi.fn().mockResolvedValue([
    {
      id: "document_test",
      type: "document",
      title: "Q2 Brief",
      contentFormat: "markdown",
      mimeType: "text/markdown",
      sizeBytes: 120,
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
  getArtifactDetail: vi.fn(),
  downloadArtifactFile: vi.fn(),
  artifactDownloadUrl: (id: string) => `/api/artifacts/${id}/download`,
  artifactLaunchPath: (artifact: { id: string; type: string }) => {
    if (artifact.type === "document") return `/documents/${artifact.id}`
    if (
      artifact.type === "webpage" ||
      artifact.type === "slides" ||
      artifact.type === "app"
    ) {
      return `/artifacts/${artifact.id}`
    }
    return null
  },
  artifactLaunchLabel: (type: string) => {
    if (type === "document") return "Open document"
    if (type === "app") return "Open app"
    if (type === "webpage" || type === "slides") return "Open artifact"
    return null
  },
  artifactWorkspacePath: (id: string) => `/artifacts/${id}`,
  documentWorkspacePath: (id: string) => `/documents/${id}`,
}))

const mockedListArtifacts = vi.mocked(listArtifacts)
const mockedListProjects = vi.mocked(listProjects)
const mockedListAgents = vi.mocked(listAgents)
const mockedListThreads = vi.mocked(listThreads)
const mockedUploadDocument = vi.mocked(uploadDocument)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("LibraryPage", () => {
  it("renders API-backed artifact cards with document workspace compatibility links", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByLabelText("Search artifacts")).toBeEnabled()
    expect(screen.getByLabelText("Filter by artifact type")).toHaveTextContent(
      "All types"
    )

    await waitFor(() => {
      expect(screen.getByText("Q2 Brief")).toBeInTheDocument()
    })
    expect(screen.getByText("document · global")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open document" })).toHaveAttribute(
      "href",
      "/documents/document_test"
    )
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled()
  })

  it("renders Open app launch actions for app artifact cards", async () => {
    mockedListArtifacts.mockResolvedValueOnce([
      {
        id: "artifact_app",
        type: "app",
        title: "Simple Calculator",
        contentFormat: "json",
        mimeType: "application/json",
        sizeBytes: 4096,
        projectNameSnapshot: null,
        threadTitleSnapshot: "Calculator thread",
        agentNameSnapshot: "Apps Agent",
        createdAt: new Date().toISOString(),
        visibilityScope: "thread",
        updatedAt: new Date().toISOString(),
      },
    ])

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Simple Calculator")).toBeInTheDocument()
    })

    expect(screen.getByRole("link", { name: "Simple Calculator" })).toHaveAttribute(
      "href",
      "/artifacts/artifact_app"
    )
    expect(screen.getByRole("button", { name: "Open app" })).toHaveAttribute(
      "href",
      "/artifacts/artifact_app"
    )
  })

  it("uses artifact type filters for document, webpage, and slides siblings", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenCalled()
    })

    await user.click(screen.getByLabelText("Filter by artifact type"))
    expect(await screen.findByRole("menuitemradio", { name: /document/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: /webpage/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: /slides/i })).toBeInTheDocument()
    await user.click(screen.getByRole("menuitemradio", { name: /webpage/i }))

    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "webpage" })
      )
    })
  })

  it("filters artifacts by source and scope without listing threads in the main scope dropdown", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenCalled()
    })
    expect(mockedListProjects).toHaveBeenCalledWith(true)
    expect(mockedListAgents).toHaveBeenCalled()
    expect(mockedListThreads).toHaveBeenCalled()

    await user.click(screen.getByLabelText("Filter by source"))
    await user.click(await screen.findByRole("menuitemradio", { name: /Docs Agent/ }))
    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenLastCalledWith(
        expect.objectContaining({ source: "agent", agentId: "agent_docs" })
      )
    })

    const scope = screen.getByLabelText("Filter by scope")
    expect(scope).toHaveTextContent("Any scope")
    expect(scope).not.toHaveTextContent("Launch evidence thread")
    expect(screen.queryByLabelText("Filter by thread")).not.toBeInTheDocument()

    await user.click(scope)
    expect(
      screen.queryByRole("menuitemradio", { name: /Launch evidence thread/ })
    ).not.toBeInTheDocument()
    await user.click(
      await screen.findByRole("menuitemradio", { name: /Launch/ })
    )
    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          source: "agent",
          agentId: "agent_docs",
          visibilityScope: "project",
          projectId: "project_launch",
        })
      )
    })
  })

  it("rejects non-markdown uploads before calling the API", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await user.click(
      screen.getByRole("button", { name: "Upload markdown document" })
    )
    await user.type(screen.getByPlaceholderText("Title"), "Diagram")
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInstanceOf(HTMLInputElement)
    fireEvent.change(input, {
      target: {
        files: [
          new File(["png"], "diagram.png", {
            type: "image/png",
          }),
        ],
      },
    })
    await user.click(screen.getByRole("button", { name: "Upload" }))

    expect(
      await screen.findByText(/Please choose a markdown/)
    ).toBeInTheDocument()
    expect(mockedUploadDocument).not.toHaveBeenCalled()
  })

  it("shows a searchable thread filter only after selecting thread scope", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenCalled()
    })
    expect(screen.queryByLabelText("Filter by thread")).not.toBeInTheDocument()

    await user.click(screen.getByLabelText("Filter by scope"))
    await user.click(
      await screen.findByRole("menuitemradio", { name: /^Threads$/ })
    )
    expect(await screen.findByLabelText("Search threads")).toBeInTheDocument()
    expect(screen.getByLabelText("Filter by thread")).toHaveTextContent(
      "Launch evidence thread"
    )

    await user.type(screen.getByLabelText("Search threads"), "Research")
    expect(screen.getByLabelText("Filter by thread")).not.toHaveTextContent(
      "Launch evidence thread"
    )
    await user.selectOptions(
      screen.getByLabelText("Filter by thread"),
      "thread_research"
    )
    await waitFor(() => {
      expect(mockedListArtifacts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visibilityScope: "thread",
          threadId: "thread_research",
        })
      )
    })
  })
})
