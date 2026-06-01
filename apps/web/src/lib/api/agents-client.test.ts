import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/client"
import {
  createAgent,
  createAgentFromPromotionDraft,
  getAgent,
  startAgentTestThread,
} from "@/lib/api/agents-client"

describe("agents client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("normalizes non-JSON error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Bad Gateway", {
          status: 502,
          statusText: "Bad Gateway",
        })
      )
    )

    await expect(getAgent("agent_1")).rejects.toMatchObject({
      name: "ApiError",
      message: "Bad Gateway",
      status: 502,
    } satisfies Partial<ApiError>)
  })

  it("reports invalid JSON from successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json")))

    await expect(getAgent("agent_1")).rejects.toMatchObject({
      name: "ApiError",
      message: "Invalid JSON response",
      status: 500,
    } satisfies Partial<ApiError>)
  })

  it("keeps agent creation free of implicit UI invalidation events", async () => {
    const now = new Date().toISOString()
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          agent: {
            id: "agent_promoted",
            name: "Promoted Support Agent",
            systemPrompt: "Assign severity.",
            model: "gpt-4o-mini",
            createdAt: now,
            updatedAt: now,
            currentConfigurationVersion: {
              id: "agent_version_promoted",
              agentId: "agent_promoted",
              version: 1,
              systemPrompt: "Assign severity.",
              model: "gpt-4o-mini",
              nativeTools: ["webSearch"],
              createdAt: now,
            },
            toolGrantCount: 0,
          },
          configurationVersions: [],
          toolGrants: [],
          information: {
            recentThreads: [],
            library: { items: [], totalCount: 0 },
          },
        },
        { status: 201 }
      )
    )
    vi.stubGlobal("fetch", fetchMock)
    const listener = vi.fn()
    window.addEventListener("agentis:agents-changed", listener)

    await createAgent({
      name: "Promoted Support Agent",
      systemPrompt: "Assign severity.",
    })

    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener("agentis:agents-changed", listener)
  })

  it("creates agents from promotion drafts through the draft command API", async () => {
    const now = new Date().toISOString()
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          agent: {
            id: "agent_promoted",
            name: "Promoted Support Agent",
            systemPrompt: "Assign severity.",
            model: "gpt-4o-mini",
            createdAt: now,
            updatedAt: now,
            currentConfigurationVersion: {
              id: "agent_version_promoted",
              agentId: "agent_promoted",
              version: 1,
              systemPrompt: "Assign severity.",
              model: "gpt-4o-mini",
              nativeTools: ["webSearch"],
              createdAt: now,
            },
            toolGrantCount: 0,
          },
          configurationVersions: [],
          toolGrants: [],
          information: {
            recentThreads: [],
            library: { items: [], totalCount: 0 },
          },
        },
        { status: 201 }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    await createAgentFromPromotionDraft("draft/1", {
      name: "Promoted Support Agent",
      systemPrompt: "Assign severity.",
      toolGrants: [],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent-promotion-drafts/draft%2F1/create-agent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Promoted Support Agent",
          systemPrompt: "Assign severity.",
          toolGrants: [],
        }),
      }
    )
  })

  it("starts agent test threads through the agent-scoped API route", async () => {
    const now = new Date().toISOString()
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          thread: {
            id: "thread_test",
            title: "Test Research Agent",
            status: "active",
            model: "gpt-4o-mini",
            mode: "agent",
            agentId: "agent_1",
            agentNameSnapshot: "Research Agent",
            createdAt: now,
            updatedAt: now,
          },
          message: {
            id: "msg_test",
            threadId: "thread_test",
            role: "user",
            parts: [{ type: "text", text: "Test Research Agent" }],
            status: "completed",
            createdAt: now,
          },
          run: {
            id: "run_test",
            threadId: "thread_test",
            status: "queued",
            model: "gpt-4o-mini",
            agentId: "agent_1",
            agentConfigurationVersionId: "agent_version_1",
            startedAt: now,
          },
        },
        { status: 201 }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const created = await startAgentTestThread("agent/1", {
      prompt: "Test Research Agent",
    })

    expect(fetchMock).toHaveBeenCalledWith("/api/agents/agent%2F1/test-thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Test Research Agent" }),
    })
    expect(created.run.agentConfigurationVersionId).toBe("agent_version_1")
  })
})
