import { describe, expect, it } from "vitest"
import {
  buildCompletedRunCost,
  buildRunCostBreakdown,
  estimateModelCostUsd,
  estimateWebSearchCostUsd,
  MOCK_MODEL_COST_USD,
  MOCK_WEB_SEARCH_COST_USD,
} from "./run-cost-attribution.js"

describe("run cost attribution", () => {
  it("returns deterministic mock model cost", () => {
    const item = estimateModelCostUsd({
      model: "openai/gpt-5.4-mini",
      usage: { promptTokens: 1, completionTokens: 10, totalTokens: 11 },
      mockRuntime: true,
    })

    expect(item.costUsd).toBe(MOCK_MODEL_COST_USD)
  })

  it("estimates live model cost from token usage", () => {
    const item = estimateModelCostUsd({
      model: "openai/gpt-5.4-mini",
      usage: { promptTokens: 1_000_000, completionTokens: 500_000 },
    })

    expect(item.costUsd).toBeGreaterThan(0)
    expect(item.provider).toBe("openai")
  })

  it("estimates web search cost from Tavily credits", () => {
    const item = estimateWebSearchCostUsd({
      output: {
        query: "agentis",
        provider: "tavily:keyless",
        results: [],
        resultCount: 0,
        truncated: false,
        metadata: { credits: 2 },
      },
    })

    expect(item.costUsd).toBe(0.02)
    expect(item.toolName).toBe("searchWeb")
  })

  it("builds deterministic mock run totals", () => {
    const result = buildCompletedRunCost({
      model: "openai/gpt-5.4-mini",
      usage: { promptTokens: 1, completionTokens: 10, totalTokens: 11 },
      toolOutputs: [
        {
          query: "agentis",
          provider: "mock",
          results: [],
          resultCount: 0,
          truncated: false,
        },
      ],
      mockRuntime: true,
    })

    expect(result.costUsd).toBe(
      buildRunCostBreakdown([
        estimateModelCostUsd({
          model: "openai/gpt-5.4-mini",
          usage: { promptTokens: 1, completionTokens: 10, totalTokens: 11 },
          mockRuntime: true,
        }),
        estimateWebSearchCostUsd({
          output: {
            query: "agentis",
            provider: "mock",
            results: [],
            resultCount: 0,
            truncated: false,
          },
          mockRuntime: true,
        }),
      ]).totalUsd
    )
    expect(result.costUsd).toBe(MOCK_MODEL_COST_USD + MOCK_WEB_SEARCH_COST_USD)
  })
})
