import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { type ReactNode } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  WorkingArtifactsRailMobile,
  WorkingArtifactsRailProvider,
  WorkingArtifactsRailSidebar,
} from "./thread-durable-artifacts"

vi.mock("@/components/documents/document-viewer", () => ({
  DocumentViewer: ({ content }: { content: string }) => (
    <div data-testid="document-preview">{content}</div>
  ),
}))

vi.mock("@/components/static-artifacts/static-artifact-preview", () => ({
  StaticArtifactPreview: () => (
    <div data-testid="static-artifact-preview">Static preview</div>
  ),
}))

vi.mock("@/lib/api/projects-client", () => ({
  listArtifacts: vi.fn(),
  getDocumentDetail: vi.fn(),
  getArtifactDetail: vi.fn(),
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
}))

import {
  getArtifactDetail,
  getDocumentDetail,
  listArtifacts,
} from "@/lib/api/projects-client"

const baseArtifact = {
  description: null,
  mimeType: "text/html",
  sizeBytes: 1024,
  previewText: null,
  metadata: null,
  visibilityScope: "thread" as const,
  threadId: "thread_test",
  threadTitleSnapshot: "Test thread",
  projectId: null,
  projectNameSnapshot: null,
  runId: "run_1",
  agentId: "agent_1",
  agentNameSnapshot: "Agent",
  currentVersionId: "version_1",
  currentVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function renderRail(
  ui: ReactNode,
  { refreshKey = "refresh-1" }: { refreshKey?: string } = {}
) {
  return render(
    <MemoryRouter>
      <WorkingArtifactsRailProvider threadId="thread_test" refreshKey={refreshKey}>
        {ui}
      </WorkingArtifactsRailProvider>
    </MemoryRouter>
  )
}

describe("WorkingArtifactsRail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDocumentDetail).mockResolvedValue({
      document: {
        id: "document_123",
        title: "Research brief",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
        sizeBytes: 120,
        visibilityScope: "thread",
        threadId: "thread_test",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      content: "# Research brief\n\nInline preview body.",
      truncated: false,
      currentVersion: 1,
      selectedVersion: 1,
      versions: [],
    })
    vi.mocked(getArtifactDetail).mockResolvedValue({
      artifact: {
        ...baseArtifact,
        id: "artifact_deck",
        title: "Slide deck",
        type: "slides",
        contentFormat: "html",
      },
      content: "<html><body>Slides</body></html>",
      truncated: false,
      currentVersion: 1,
      selectedVersion: 1,
      versions: [],
    })
  })

  it("lists artifacts newest first with workspace links", async () => {
    const older = new Date("2026-01-01T00:00:00.000Z").toISOString()
    const newer = new Date("2026-06-01T00:00:00.000Z").toISOString()
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "document_old",
        title: "Older document",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
        updatedAt: older,
      },
      {
        ...baseArtifact,
        id: "document_new",
        title: "Newer document",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
        updatedAt: newer,
      },
    ])

    renderRail(<WorkingArtifactsRailSidebar />)

    expect(await screen.findByText("Newer document")).toBeInTheDocument()
    const listItems = screen.getAllByRole("listitem")
    expect(listItems[0]).toHaveTextContent("Newer document")
    expect(listItems[1]).toHaveTextContent("Older document")
    expect(screen.getAllByRole("button", { name: "Open document" })[0]).toHaveAttribute(
      "href",
      "/documents/document_new"
    )
  })

  it("loads document preview for the selected markdown document", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "document_123",
        title: "Research brief: AI agents",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
      },
    ])

    const user = userEvent.setup()
    renderRail(<WorkingArtifactsRailSidebar />)

    expect(await screen.findByText("Research brief: AI agents")).toBeInTheDocument()
    expect(getDocumentDetail).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Preview" }))
    await waitFor(() => {
      expect(getDocumentDetail).toHaveBeenCalledWith("document_123")
    })
    expect(await screen.findByTestId("document-preview")).toHaveTextContent(
      "Inline preview body."
    )
  })

  it("loads static artifact preview when a slides artifact is selected", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "artifact_deck",
        title: "How to Create a Good Changelog",
        type: "slides",
        contentFormat: "html",
      },
    ])

    const user = userEvent.setup()
    renderRail(<WorkingArtifactsRailSidebar />)

    expect(
      await screen.findByText("How to Create a Good Changelog")
    ).toBeInTheDocument()
    expect(getArtifactDetail).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Preview" }))
    await waitFor(() => {
      expect(getArtifactDetail).toHaveBeenCalledWith("artifact_deck")
    })
    expect(await screen.findByTestId("static-artifact-preview")).toBeInTheDocument()
  })

  it("shows preview unavailable for unsupported artifact types", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "artifact_app",
        title: "Simple Calculator",
        type: "app",
        contentFormat: "json",
      },
    ])

    const user = userEvent.setup()
    renderRail(<WorkingArtifactsRailSidebar />)

    expect(await screen.findByText("Simple Calculator")).toBeInTheDocument()
    expect(getArtifactDetail).not.toHaveBeenCalled()
    expect(getDocumentDetail).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Preview" }))
    expect(
      await screen.findByText(/preview unavailable for this artifact type/i)
    ).toBeInTheDocument()
  })

  it("shows empty and list error states", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([])
    const { unmount } = renderRail(<WorkingArtifactsRailSidebar />)
    expect(await screen.findByText("No working artifacts yet.")).toBeInTheDocument()
    unmount()

    vi.mocked(listArtifacts).mockRejectedValueOnce(new Error("Artifacts unavailable"))
    renderRail(<WorkingArtifactsRailSidebar />)
    expect(await screen.findByText("Artifacts unavailable")).toBeInTheDocument()
  })

  it("shows preview errors without removing the selected artifact", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "document_123",
        title: "Broken document",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
      },
    ])
    vi.mocked(getDocumentDetail).mockRejectedValueOnce(
      new Error("Could not load document detail.")
    )

    const user = userEvent.setup()
    renderRail(<WorkingArtifactsRailSidebar />)

    expect(await screen.findByText("Broken document")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Preview" }))
    expect(
      await screen.findByText("Could not load document detail.")
    ).toBeInTheDocument()
  })

  it("preserves selection across refresh when the artifact still exists", async () => {
    const user = userEvent.setup()
    vi.mocked(listArtifacts)
      .mockResolvedValueOnce([
        {
          ...baseArtifact,
          id: "document_a",
          title: "Document A",
          type: "document",
          contentFormat: "markdown",
          mimeType: "text/markdown",
          updatedAt: new Date("2026-06-02T00:00:00.000Z").toISOString(),
        },
        {
          ...baseArtifact,
          id: "document_b",
          title: "Document B",
          type: "document",
          contentFormat: "markdown",
          mimeType: "text/markdown",
          updatedAt: new Date("2026-06-01T00:00:00.000Z").toISOString(),
        },
      ])
      .mockResolvedValueOnce([
        {
          ...baseArtifact,
          id: "document_b",
          title: "Document B",
          type: "document",
          contentFormat: "markdown",
          mimeType: "text/markdown",
          updatedAt: new Date("2026-06-03T00:00:00.000Z").toISOString(),
        },
        {
          ...baseArtifact,
          id: "document_a",
          title: "Document A",
          type: "document",
          contentFormat: "markdown",
          mimeType: "text/markdown",
          updatedAt: new Date("2026-06-02T00:00:00.000Z").toISOString(),
        },
      ])

    const { rerender } = render(
      <MemoryRouter>
        <WorkingArtifactsRailProvider threadId="thread_test" refreshKey="refresh-1">
          <WorkingArtifactsRailSidebar />
        </WorkingArtifactsRailProvider>
      </MemoryRouter>
    )

    const documentB = await screen.findByRole("button", { name: /Document B/i })
    await user.click(documentB)
    expect(documentB.className).toMatch(/border-primary/)

    rerender(
      <MemoryRouter>
        <WorkingArtifactsRailProvider threadId="thread_test" refreshKey="refresh-2">
          <WorkingArtifactsRailSidebar />
        </WorkingArtifactsRailProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(listArtifacts).toHaveBeenCalledTimes(2)
    })
    const selected = screen.getByRole("button", { name: /Document B/i })
    expect(selected.className).toMatch(/border-primary/)
  })

  it("keeps preview collapsed by default", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "document_123",
        title: "Research brief: AI agents",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
      },
    ])

    renderRail(<WorkingArtifactsRailSidebar />)

    const previewToggle = await screen.findByRole("button", { name: "Preview" })
    expect(previewToggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByTestId("document-preview")).not.toBeInTheDocument()
    expect(getDocumentDetail).not.toHaveBeenCalled()
  })

  it("collapses on mobile by default and can be opened and closed", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "document_123",
        title: "Research brief: AI agents",
        type: "document",
        contentFormat: "markdown",
        mimeType: "text/markdown",
      },
    ])
    const user = userEvent.setup()

    renderRail(<WorkingArtifactsRailMobile />)

    const toggle = screen.getByRole("button", { name: /working artifacts/i })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Research brief: AI agents")).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(
      await within(document.body).findByText("Research brief: AI agents")
    ).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Research brief: AI agents")).not.toBeInTheDocument()
  })
})
