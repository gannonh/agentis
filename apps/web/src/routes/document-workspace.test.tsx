import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentWorkspacePage } from "@/routes/document-workspace"

const getDocumentDetail = vi.fn()
const updateDocumentContent = vi.fn()
const downloadDocumentFile = vi.fn()

vi.mock("@/lib/api/projects-client", () => ({
  getDocumentDetail: (...args: unknown[]) => getDocumentDetail(...args),
  updateDocumentContent: (...args: unknown[]) => updateDocumentContent(...args),
  downloadDocumentFile: (...args: unknown[]) => downloadDocumentFile(...args),
  documentWorkspacePath: (id: string) => `/documents/${id}`,
  documentDownloadUrl: (id: string) => `/api/documents/${id}/download`,
}))

const markdownDocument = {
  id: "document_test",
  title: "Q2 Brief",
  documentType: "markdown" as const,
  contentFormat: "markdown" as const,
  mimeType: "text/markdown",
  sizeBytes: 120,
  visibilityScope: "global" as const,
  agentNameSnapshot: "Docs Agent",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const imageDocument = {
  ...markdownDocument,
  id: "document_image",
  title: "Diagram",
  documentType: "image" as const,
  contentFormat: "binary" as const,
  mimeType: "image/png",
}

function renderWorkspace(documentId = "document_test") {
  return render(
    <MemoryRouter initialEntries={[`/documents/${documentId}`]}>
      <Routes>
        <Route path="/documents/:documentId" element={<DocumentWorkspacePage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getDocumentDetail.mockImplementation((documentId: string) => {
    if (documentId === "document_image") {
      return Promise.resolve({
        document: imageDocument,
        content: null,
        truncated: false,
        selectedVersion: null,
        currentVersion: null,
        versions: [],
      })
    }
    return Promise.resolve({
      document: markdownDocument,
      content: "# Brief\n\nSummary",
      truncated: false,
      selectedVersion: 1,
      currentVersion: 1,
      versions: [
        {
          id: "version_1",
          version: 1,
          changeSummary: "Created document",
          createdAt: new Date().toISOString(),
        },
      ],
    })
  })
})

describe("DocumentWorkspacePage", () => {
  it("renders metadata, source/scope, preview, and download action", async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Q2 Brief" })).toBeInTheDocument()
    })
    expect(screen.getByText("Agent generated")).toBeInTheDocument()
    expect(screen.getByText("Global")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument()
    expect(screen.getByText("Summary")).toBeInTheDocument()
  })

  it("switches to markdown view and saves a new version", async () => {
    const user = userEvent.setup()
    updateDocumentContent.mockResolvedValue({
      document: { ...markdownDocument, currentVersion: 2 },
      currentVersion: 2,
    })
    getDocumentDetail
      .mockResolvedValueOnce({
        document: markdownDocument,
        content: "# Brief\n\nSummary",
        truncated: false,
        selectedVersion: 1,
        currentVersion: 1,
        versions: [
          {
            id: "version_1",
            version: 1,
            changeSummary: "Created document",
            createdAt: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        document: { ...markdownDocument, currentVersion: 2 },
        content: "# Brief\n\nUpdated summary",
        truncated: false,
        selectedVersion: 2,
        currentVersion: 2,
        versions: [
          {
            id: "version_2",
            version: 2,
            changeSummary: "Updated in document workspace",
            createdAt: new Date().toISOString(),
          },
          {
            id: "version_1",
            version: 1,
            changeSummary: "Created document",
            createdAt: new Date().toISOString(),
          },
        ],
      })

    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("tab", { name: "Markdown" }))
    expect(screen.getByText(/# Brief/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit" }))
    await user.clear(screen.getByRole("textbox", { name: "Markdown editor" }))
    await user.type(
      screen.getByRole("textbox", { name: "Markdown editor" }),
      "# Brief\n\nUpdated summary"
    )
    await user.click(screen.getByRole("button", { name: "Save new version" }))

    await waitFor(() => {
      expect(updateDocumentContent).toHaveBeenCalledWith("document_test", {
        content: "# Brief\n\nUpdated summary",
        baseVersion: 1,
        changeSummary: "Updated in document workspace",
      })
    })
  })

  it("loads prior version content in read-only historical mode", async () => {
    const user = userEvent.setup()
    getDocumentDetail
      .mockResolvedValueOnce({
        document: { ...markdownDocument, currentVersion: 2 },
        content: "# Brief\n\nUpdated",
        truncated: false,
        selectedVersion: 2,
        currentVersion: 2,
        versions: [
          {
            id: "version_2",
            version: 2,
            changeSummary: "Updated",
            createdAt: new Date().toISOString(),
          },
          {
            id: "version_1",
            version: 1,
            changeSummary: "Created document",
            createdAt: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        document: { ...markdownDocument, currentVersion: 2 },
        content: "# Brief\n\nOriginal",
        truncated: false,
        selectedVersion: 1,
        currentVersion: 2,
        versions: [
          {
            id: "version_2",
            version: 2,
            changeSummary: "Updated",
            createdAt: new Date().toISOString(),
          },
          {
            id: "version_1",
            version: 1,
            changeSummary: "Created document",
            createdAt: new Date().toISOString(),
          },
        ],
      })

    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText("Version history")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Version 1" }))

    await waitFor(() => {
      expect(getDocumentDetail).toHaveBeenLastCalledWith("document_test", {
        version: 1,
      })
    })
    expect(
      screen.getByText(/viewing an older version/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
  })

  it("shows read-only state for non-markdown documents", async () => {
    renderWorkspace("document_image")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Diagram" })).toBeInTheDocument()
    })
    expect(
      screen.getByText(/read-only in the workspace/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
  })
})
