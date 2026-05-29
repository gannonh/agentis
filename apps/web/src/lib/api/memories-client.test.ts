import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/client"
import { updateMemory } from "./memories-client"

describe("memories client", () => {
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

    await expect(
      updateMemory("memory_1", { content: "Updated memory" })
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "Bad Gateway",
      status: 502,
    } satisfies Partial<ApiError>)
  })

  it("encodes memory ids in update routes", async () => {
    const now = "2026-05-29T00:00:00.000Z"
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "memory/1",
        content: "Updated memory",
        category: "memory_category_preference",
        usageGuidance: "Use when testing memory updates.",
        tags: [],
        importance: "medium",
        date: "2026-05-29",
        scope: "global",
        associatedAgent: null,
        associatedAgents: [],
        source: "user-generated",
        sourceThreadId: null,
        sourceThreadTitle: null,
        provenance: "created manually by user",
        pinnedToContext: false,
        createdAt: now,
        updatedAt: now,
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await updateMemory("memory/1", { content: "Updated memory" })

    expect(fetchMock).toHaveBeenCalledWith("/api/memories/memory%2F1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Updated memory" }),
    })
  })
})
