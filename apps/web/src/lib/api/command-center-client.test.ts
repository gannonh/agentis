import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/client"
import {
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
        })
      )
    )

    await expect(fetchCommandCenterSummary()).resolves.toEqual({
      totalCostUsd: 1.23,
      totalRuns: 4,
      activeRuns: 1,
      agentCount: 2,
    })
  })

  it("fetches roster and recent runs", async () => {
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
            },
          ])
        )
    )

    await expect(fetchCommandCenterRoster()).resolves.toEqual([
      expect.objectContaining({ agentId: "agent_1", runCount: 2 }),
    ])
    await expect(fetchCommandCenterRecentRuns()).resolves.toEqual([
      expect.objectContaining({ id: "run_1", title: "Ops run" }),
    ])
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
