import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { LibraryPage } from "./library"

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
      updatedAt: new Date().toISOString(),
    },
  ]),
  listProjects: vi.fn().mockResolvedValue([]),
  uploadDocument: vi.fn(),
  documentDownloadUrl: (id: string) => `/api/documents/${id}/download`,
}))

describe("LibraryPage", () => {
  it("renders API-backed document cards", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByLabelText("Search documents")).toBeEnabled()

    await waitFor(() => {
      expect(screen.getByText("Q2 Brief")).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled()
  })
})
