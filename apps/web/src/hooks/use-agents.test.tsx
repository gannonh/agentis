import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useAgents } from "./use-agents"
import { listAgents } from "@/lib/api/agents-client"

vi.mock("@/lib/api/agents-client", () => ({
  listAgents: vi.fn(),
}))

function agent(id: string, name: string) {
  const now = new Date().toISOString()
  return {
    id,
    name,
    description: "Created through the API",
    systemPrompt: "Answer with citations.",
    model: "gpt-4o-mini",
    createdAt: now,
    updatedAt: now,
    currentConfigurationVersion: {
      id: `${id}_version`,
      agentId: id,
      version: 1,
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
      createdAt: now,
    },
    toolGrantCount: 0,
  }
}

describe("useAgents", () => {
  beforeEach(() => {
    vi.mocked(listAgents).mockReset()
  })

  it("refreshes mounted agent surfaces after agent creation events", async () => {
    vi.mocked(listAgents)
      .mockResolvedValueOnce([agent("agent_old", "Existing Agent")])
      .mockResolvedValueOnce([agent("agent_new", "Promoted Support Agent")])

    const { result } = renderHook(() => useAgents())

    await waitFor(() => {
      expect(result.current.agents.map((item) => item.name)).toEqual([
        "Existing Agent",
      ])
    })

    act(() => {
      window.dispatchEvent(new CustomEvent("agentis:agents-changed"))
    })

    await waitFor(() => {
      expect(result.current.agents.map((item) => item.name)).toEqual([
        "Promoted Support Agent",
      ])
    })
  })
})
