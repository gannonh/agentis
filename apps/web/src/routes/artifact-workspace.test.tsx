import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ArtifactWorkspacePage } from "./artifact-workspace"

const getArtifactDetail = vi.fn()
const downloadArtifactFile = vi.fn()

vi.mock("@/lib/api/projects-client", () => ({
  getArtifactDetail: (...args: unknown[]) => getArtifactDetail(...args),
  downloadArtifactFile: (...args: unknown[]) => downloadArtifactFile(...args),
  artifactWorkspacePath: (id: string) => `/artifacts/${id}`,
  artifactDownloadUrl: (id: string) => `/api/artifacts/${id}/download`,
}))

const now = new Date().toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  getArtifactDetail.mockResolvedValue({
    artifact: {
      id: "webpage_launch",
      title: "Launch page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 42,
      visibilityScope: "global",
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {
        artifactType: "webpage",
        renderMode: "html",
        theme: "landing",
        generationPath: "modelHtml",
        assetReferences: [],
        safetyValidationResult: { status: "passed", warnings: [], errors: [] },
        generationWarnings: [],
      },
    },
    content: "<main><h1>Launch</h1></main>",
    truncated: false,
    selectedVersion: 1,
    currentVersion: 1,
    versions: [{ id: "version_1", version: 1, createdAt: now }],
  })
})

function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={["/artifacts/webpage_launch"]}>
      <Routes>
        <Route path="/artifacts/:artifactId" element={<ArtifactWorkspacePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ArtifactWorkspacePage", () => {
  it("loads an artifact detail route and renders the static preview workspace", async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(getArtifactDetail).toHaveBeenCalledWith("webpage_launch", {})
    })
    expect(screen.getByRole("heading", { name: "Launch page" })).toBeInTheDocument()
    expect(screen.getByText("webpage · html · landing")).toBeInTheDocument()
    expect(screen.getByTitle("Launch page static webpage")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument()
  })
})
