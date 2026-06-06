import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ArtifactWorkspacePage } from "./artifact-workspace"

const getArtifactDetail = vi.fn()
const downloadArtifactFile = vi.fn()
const listProjects = vi.fn()
const updateArtifactVisibility = vi.fn()

vi.mock("@/lib/api/projects-client", () => ({
  getArtifactDetail: (...args: unknown[]) => getArtifactDetail(...args),
  downloadArtifactFile: (...args: unknown[]) => downloadArtifactFile(...args),
  listProjects: (...args: unknown[]) => listProjects(...args),
  updateArtifactVisibility: (...args: unknown[]) =>
    updateArtifactVisibility(...args),
  artifactWorkspacePath: (id: string) => `/artifacts/${id}`,
  artifactDownloadUrl: (id: string, options: { version?: number | null } = {}) =>
    options.version == null
      ? `/api/artifacts/${id}/download`
      : `/api/artifacts/${id}/download?version=${options.version}`,
}))

const now = new Date().toISOString()
const sampleProject = {
  id: "project_launch",
  name: "Agentis Launch",
  description: null,
  goals: null,
  status: "active" as const,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
}

beforeEach(() => {
  vi.clearAllMocks()
  listProjects.mockResolvedValue([sampleProject])
  updateArtifactVisibility.mockResolvedValue({
    artifact: {
      id: "webpage_launch",
      title: "Launch page",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 42,
      visibilityScope: "project",
      projectId: sampleProject.id,
      projectNameSnapshot: sampleProject.name,
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
    previousVisibilityScope: "global" as const,
  })
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
    expect(screen.getByLabelText("Artifact scope")).toHaveValue("global")
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument()
  })

  it("downloads and links to the selected historical artifact version", async () => {
    const user = userEvent.setup()
    getArtifactDetail.mockResolvedValueOnce({
      artifact: {
        id: "webpage_launch",
        title: "Launch page",
        type: "webpage",
        contentFormat: "html",
        mimeType: "text/html",
        sizeBytes: 42,
        visibilityScope: "global",
        currentVersion: 2,
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
      content: "<main><h1>Launch v1</h1></main>",
      truncated: false,
      selectedVersion: 1,
      currentVersion: 2,
      versions: [
        { id: "version_2", version: 2, createdAt: now },
        { id: "version_1", version: 1, createdAt: now },
      ],
    })

    renderWorkspace()

    await waitFor(() => {
      expect(getArtifactDetail).toHaveBeenCalledWith("webpage_launch", {})
    })
    expect(screen.getByText("Historical view")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Direct download link" })).toHaveAttribute(
      "href",
      "/api/artifacts/webpage_launch/download?version=1"
    )

    await user.click(screen.getByRole("button", { name: "Download" }))

    expect(downloadArtifactFile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "webpage_launch" }),
      { version: 1 }
    )
  })

  it("shows a project picker before applying project scope", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByLabelText("Artifact scope")).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText("Artifact scope"), "project")

    expect(screen.getByLabelText("Project")).toBeInTheDocument()
    expect(updateArtifactVisibility).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText("Project"), sampleProject.id)

    await waitFor(() => {
      expect(updateArtifactVisibility).toHaveBeenCalledWith("webpage_launch", {
        visibilityScope: "project",
        projectId: sampleProject.id,
      })
    })
  })
})
