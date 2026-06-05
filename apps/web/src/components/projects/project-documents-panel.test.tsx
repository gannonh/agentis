import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { ProjectDocumentsPanel } from "./project-documents-panel"

vi.mock("@/lib/api/projects-client", () => ({
  documentWorkspacePath: (id: string) => `/documents/${id}`,
  downloadDocumentFile: vi.fn(),
}))

describe("ProjectDocumentsPanel", () => {
  it("links project documents to the workspace", () => {
    render(
      <MemoryRouter>
        <ProjectDocumentsPanel
          title="Project documents"
          emptyMessage="No documents"
          documents={[
            {
              id: "document_test",
              title: "Launch brief",
              type: "document",
              contentFormat: "markdown",
              mimeType: "text/markdown",
              sizeBytes: 120,
              visibilityScope: "project",
              projectId: "project_launch",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]}
        />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("link", { name: "Open document" })
    ).toHaveAttribute("href", "/documents/document_test")
  })
})
