import { describe, expect, it } from "vitest"
import { GENERIC_AGENTIS_AGENT_ID } from "@workspace/shared"
import {
  threadAgentDisplayName,
  threadListStatusLabel,
} from "./thread-list-display"

describe("thread list display helpers", () => {
  it("prefers agent name snapshot", () => {
    expect(
      threadAgentDisplayName({
        agentId: "agent_custom",
        agentNameSnapshot: "Research Agent",
      })
    ).toBe("Research Agent")
  })

  it("falls back to Agentis for generic agent", () => {
    expect(
      threadAgentDisplayName({
        agentId: GENERIC_AGENTIS_AGENT_ID,
        agentNameSnapshot: null,
      })
    ).toBe("Agentis")
  })

  it("shows Waiting when pending approval exists", () => {
    expect(
      threadListStatusLabel({
        id: "thread_1",
        title: "Thread",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        starred: false,
        createdAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:00:00.000Z",
        hasPendingApproval: true,
      })
    ).toBe("Waiting")
  })

  it("returns null when agentId is missing", () => {
    expect(
      threadAgentDisplayName({
        agentId: null,
        agentNameSnapshot: null,
      })
    ).toBe(null)
  })

  it("returns null for custom agent without snapshot", () => {
    expect(
      threadAgentDisplayName({
        agentId: "agent_custom_research",
        agentNameSnapshot: null,
      })
    ).toBe(null)
  })

  it("maps finished status to Finished", () => {
    expect(
      threadListStatusLabel({
        id: "thread_2",
        title: "Thread",
        status: "finished",
        model: "gpt-4o-mini",
        mode: "agent",
        starred: false,
        createdAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:00:00.000Z",
        hasPendingApproval: false,
      })
    ).toBe("Finished")
  })

  it("returns last run status when not pending and not finished", () => {
    expect(
      threadListStatusLabel({
        id: "thread_3",
        title: "Thread",
        status: "active",
        model: "gpt-4o-mini",
        mode: "agent",
        starred: false,
        createdAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:00:00.000Z",
        hasPendingApproval: false,
        lastRunStatus: "tool-calling",
      })
    ).toBe("tool-calling")
  })
})
