import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AgentKnowledgeTab } from "./agent-knowledge-tab"
import type { AgentDetailInformation } from "@workspace/shared"

function emptyInformation(): AgentDetailInformation {
  return {
    recentThreads: [],
    library: { items: [], totalCount: 0 },
    memories: { agent: [], global: [] },
  }
}

describe("AgentKnowledgeTab", () => {
  it("renders agent and global memories available to the agent", () => {
    render(
      <AgentKnowledgeTab
        information={{
          recentThreads: [],
          library: { items: [], totalCount: 0 },
          memories: {
            agent: [
              {
                id: "memory_agent",
                content: "Use source quality notes in every brief.",
                category: "memory_category_tools_workflows",
                usageGuidance: "Use in research briefs.",
                tags: ["research"],
                importance: "high",
                date: "2026-05-28",
                scope: "agent",
                associatedAgent: "agent_created",
                source: "user-generated",
                provenance: "created manually by user",
                pinnedToContext: true,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
              },
            ],
            global: [
              {
                id: "memory_global",
                content: "Always cite customer interviews before roadmap changes.",
                category: "memory_category_preference",
                usageGuidance: "Use during roadmap analysis.",
                tags: ["roadmap"],
                importance: "medium",
                date: "2026-05-28",
                scope: "global",
                associatedAgent: null,
                source: "user-generated",
                provenance: "created manually by user",
                pinnedToContext: false,
                createdAt: "2026-05-28T00:00:00.000Z",
                updatedAt: "2026-05-28T00:00:00.000Z",
              },
            ],
          },
        }}
      />
    )

    const memories = within(screen.getByRole("region", { name: "Memories" }))
    expect(memories.getByText("Agent Memories")).toBeInTheDocument()
    expect(memories.getByText("1 active")).toBeInTheDocument()
    expect(
      memories.getByText("Use source quality notes in every brief.")
    ).toBeInTheDocument()
    expect(memories.getByText("Global Memories")).toBeInTheDocument()
    expect(
      memories.getByText("Always cite customer interviews before roadmap changes.")
    ).toBeInTheDocument()
  })

  it("renders honest Knowledge placeholder copy for AGT-06 surfaces", () => {
    render(<AgentKnowledgeTab information={emptyInformation()} />)

    for (const heading of [
      "Knowledge discovery",
      "Knowledge access",
      "Memories",
      "Context files",
      "Library",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
    }

    for (const text of [
      "Allow this agent to find and use existing knowledge while it works.",
      "Knowledge discovery controls will be available when this capability is backed by the agent configuration API.",
      "Access presets and per-agent knowledge permissions will appear here when those settings are available.",
      "No memories available yet. Add one to give this agent persistent context.",
      "No context files added yet. Attach reference files when this capability is available.",
      "0 items",
      "No library artifacts yet",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }

    expect(screen.queryByRole("button", { name: "Add memories" })).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Add context file" })
    ).toBeDisabled()

    const knowledgeSurface = screen.getByTestId("agent-knowledge-tab")
    expect(knowledgeSurface).not.toHaveTextContent(
      /mock|fixture|runtime|integration/i
    )
  })

  it("preserves API-backed library summaries inside Knowledge", () => {
    const now = new Date().toISOString()

    render(
      <AgentKnowledgeTab
        information={{
          recentThreads: [],
          memories: { agent: [], global: [] },
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

    const library = within(screen.getByRole("region", { name: "Library" }))
    for (const text of [
      "1 item",
      "Research notes",
      "document · text/markdown",
      "From Test Created Research Agent",
    ]) {
      expect(library.getByText(text)).toBeInTheDocument()
    }
  })
})
