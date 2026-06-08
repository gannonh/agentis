import { describe, expect, it, vi, afterEach } from "vitest"
import { fetchRuntimeHealth } from "./client"

describe("fetchRuntimeHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns api_unavailable when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")))

    await expect(fetchRuntimeHealth()).resolves.toEqual({
      available: false,
      reason: "api_unavailable",
    })
  })

  it("parses healthy runtime response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          available: true,
          model: "openai/gpt-5.4-mini",
          defaultModel: "openai/gpt-5.4-mini",
          models: [
            {
              id: "openai/gpt-5.4-mini",
              label: "GPT-5.4 Mini",
              tier: "balanced",
            },
          ],
        }),
      })
    )

    await expect(fetchRuntimeHealth()).resolves.toEqual({
      available: true,
      model: "openai/gpt-5.4-mini",
      defaultModel: "openai/gpt-5.4-mini",
      models: [
        {
          id: "openai/gpt-5.4-mini",
          label: "GPT-5.4 Mini",
          tier: "balanced",
        },
      ],
    })
  })
})
