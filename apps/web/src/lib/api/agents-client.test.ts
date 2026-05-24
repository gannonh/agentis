import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/client"
import { getAgent } from "@/lib/api/agents-client"

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
})
