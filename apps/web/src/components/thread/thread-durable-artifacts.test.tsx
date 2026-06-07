import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { ThreadDurableArtifacts } from "./thread-durable-artifacts"

vi.mock("@/lib/api/projects-client", () => ({
  listArtifacts: vi.fn(),
  artifactLaunchPath: (artifact: { id: string; type: string }) => {
    if (artifact.type === "document") return `/documents/${artifact.id}`
    if (artifact.type === "app") return `/artifacts/${artifact.id}`
    return null
  },
  artifactLaunchLabel: (type: string) => {
    if (type === "document") return "Open document"
    if (type === "app") return "Open app"
    return null
  },
}))

import { listArtifacts } from "@/lib/api/projects-client"

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

describe("ThreadDurableArtifacts", () => {
  it("shows an Open app launch button for app artifacts", async () => {
    vi.mocked(listArtifacts).mockResolvedValueOnce([
      {
        ...baseArtifact,
        id: "artifact_app",
        title: "Simple Calculator",
        type: "app",
        contentFormat: "json",
      },
    ])

    render(
      <MemoryRouter>
        <ThreadDurableArtifacts threadId="thread_test" />
      </MemoryRouter>
    )

    expect(await screen.findByText("Simple Calculator")).toBeInTheDocument()
    expect(screen.getByText("app · json · v1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open app" })).toHaveAttribute(
      "href",
      "/artifacts/artifact_app"
    )
  })
})
