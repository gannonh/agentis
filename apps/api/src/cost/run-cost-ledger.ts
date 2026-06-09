import type { RunCostLineItem, SearchWebOutput } from "@workspace/shared"
import {
  buildRunCostBreakdown,
  estimateModelCostUsd,
  estimateWebSearchCostUsd,
} from "./run-cost-attribution.js"

export class RunCostLedger {
  private readonly toolOutputs: SearchWebOutput[] = []

  constructor(
    private readonly model: string,
    private readonly mockRuntime: boolean
  ) {}

  recordWebSearch(output: SearchWebOutput) {
    this.toolOutputs.push(output)
  }

  finalize(usage: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }) {
    const lineItems: RunCostLineItem[] = [
      estimateModelCostUsd({
        model: this.model,
        usage,
        mockRuntime: this.mockRuntime,
      }),
      ...this.toolOutputs.map((output) =>
        estimateWebSearchCostUsd({ output, mockRuntime: this.mockRuntime })
      ),
    ]
    const costBreakdown = buildRunCostBreakdown(lineItems)
    return {
      costUsd: costBreakdown.totalUsd,
      costBreakdown,
    }
  }
}
