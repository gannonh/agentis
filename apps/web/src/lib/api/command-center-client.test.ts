import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/client"
import {
  fetchCommandCenterNeedsAttention,
  fetchCommandCenterRecentRuns,
  fetchCommandCenterRoster,
  fetchCommandCenterSummary,
} from "@/lib/api/command-center-client"

describe("command center client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fetches summary metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          totalCostUsd: 1.23,
          totalRuns: 4,
          activeRuns: 1,
          agentCount: 2,
          avgScore: null,
          evaluatedRunCount: 0,
        })
      )
    )

    await expect(fetchCommandCenterSummary()).resolves.toEqual({
      totalCostUsd: 1.23,
      totalRuns: 4,
      activeRuns: 1,
      agentCount: 2,
      avgScore: null,
      evaluatedRunCount: 0,
    })
  })

  it("fetches roster, recent runs, and needs-attention items", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json([
            {
              agentId: "agent_1",
              runCount: 2,
              totalCostUsd: 0.5,
              lastRunAt: "2026-06-09T12:00:00.000Z",
              activeRunCount: 0,
              avgScore: 82,
              evaluatedRunCount: 2,
            },
          ])
        )
        .mockResolvedValueOnce(
          Response.json([
            {
              id: "run_1",
              threadId: "thread_1",
              agentId: "agent_1",
              title: "Ops run",
              status: "completed",
              costUsd: 0.25,
              startedAt: "2026-06-09T12:00:00.000Z",
              evaluationScore: null,
            },
          ])
        )
        .mockResolvedValueOnce(
          Response.json({
            totalCount: 1,
            items: [
              {
                id: "attention_failed_run_1",
                type: "failed_run",
                title: "Run failed: Ops run",
                description: "Tool failed",
                tag: "Failed run",
                severity: "critical",
                createdAt: "2026-06-09T12:00:00.000Z",
                href: "/threads/thread_1",
                dismissible: false,
                agentId: "agent_1",
                threadId: "thread_1",
                runId: "run_1",
              },
            ],
          })
        )
    )

    await expect(fetchCommandCenterRoster()).resolves.toEqual([
      expect.objectContaining({ agentId: "agent_1", runCount: 2 }),
    ])
    await expect(fetchCommandCenterRecentRuns()).resolves.toEqual([
      expect.objectContaining({ id: "run_1", title: "Ops run" }),
    ])
    await expect(fetchCommandCenterNeedsAttention()).resolves.toEqual({
      totalCount: 1,
      items: [
        expect.objectContaining({
          id: "attention_failed_run_1",
          type: "failed_run",
        }),
      ],
    })
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

    await expect(fetchCommandCenterSummary()).rejects.toMatchObject({
      name: "ApiError",
      message: "Bad Gateway",
      status: 502,
    } satisfies Partial<ApiError>)
  })
})
