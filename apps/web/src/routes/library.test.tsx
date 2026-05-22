import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { LibraryPage } from "./library"

vi.mock("@/lib/api/projects-client", () => ({
  listArtifacts: vi.fn().mockResolvedValue([
    {
      id: "artifact_test",
      title: "Q2 Brief",
      type: "document",
      mimeType: "text/plain",
      sizeBytes: 120,
      storageKey: "artifacts/test.txt",
      projectNameSnapshot: "Launch",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
  listProjects: vi.fn().mockResolvedValue([]),
  uploadArtifact: vi.fn(),
  artifactDownloadUrl: (id: string) => `/api/artifacts/${id}/download`,
}))

describe("LibraryPage", () => {
  it("renders API-backed artifact cards", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByLabelText("Search artifacts")).toBeEnabled()

    await waitFor(() => {
      expect(screen.getByText("Q2 Brief")).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled()
  })
})
