import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AgentKnowledgeTab } from "./agent-edit-tabs"
import type { AgentDetailInformation } from "@workspace/shared"

function emptyInformation(): AgentDetailInformation {
  return {
    recentThreads: [],
    library: { items: [], totalCount: 0 },
  }
}

describe("AgentKnowledgeTab", () => {
  it("renders honest Knowledge placeholder copy for AGT-06 surfaces", () => {
    render(<AgentKnowledgeTab information={emptyInformation()} />)

    expect(screen.getByRole("heading", { name: "Knowledge discovery" })).toBeInTheDocument()
    expect(screen.getByText("Allow this agent to find and use existing knowledge while it works.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Knowledge access" })).toBeInTheDocument()

    for (const label of ["Personal", "Curated", "Team learning", "Custom"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument()
    }

    expect(screen.getByRole("heading", { name: "Memories" })).toBeInTheDocument()
    expect(screen.getByText("No memories yet. Add one to give this agent persistent context.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add memories" })).toBeDisabled()

    expect(screen.getByRole("heading", { name: "Context files" })).toBeInTheDocument()
    expect(screen.getByText("No context files added yet. Attach reference files when this capability is available.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add context file" })).toBeDisabled()

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByText("0 items")).toBeInTheDocument()
    expect(screen.getByText("No library artifacts yet")).toBeInTheDocument()

    const knowledgeSurface = screen.getByTestId("agent-knowledge-tab")
    expect(knowledgeSurface).not.toHaveTextContent(/mock|fixture|runtime|integration/i)
  })

  it("preserves API-backed library summaries inside Knowledge", () => {
    const now = new Date().toISOString()

    render(
      <AgentKnowledgeTab
        information={{
          recentThreads: [],
          library: {
            totalCount: 1,
            items: [
              {
                id: "artifact_notes",
                title: "Research notes",
                description: null,
                type: "document",
                mimeType: "text/markdown",
                sizeBytes: 42,
                previewText: "Summary",
                metadata: null,
                projectId: null,
                projectNameSnapshot: null,
                threadId: "thread_recent",
                threadTitleSnapshot: "Test Created Research Agent",
                runId: "run_recent",
                agentId: "agent_created",
                agentNameSnapshot: "Created Research Agent",
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
        }}
      />
    )

    const library = screen.getByRole("region", { name: "Library" })
    expect(within(library).getByText("1 item")).toBeInTheDocument()
    expect(within(library).getByText("Research notes")).toBeInTheDocument()
    expect(within(library).getByText("document · text/markdown")).toBeInTheDocument()
    expect(within(library).getByText("From Test Created Research Agent")).toBeInTheDocument()
  })
})
