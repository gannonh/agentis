import {
  GATEWAY_MODEL_CATALOG,
  type GatewayModelTier,
  type RunCostBreakdown,
  type RunCostLineItem,
  type RunUsage,
  type SearchWebOutput,
} from "@workspace/shared"

export const MOCK_MODEL_COST_USD = 0.0011
export const MOCK_WEB_SEARCH_COST_USD = 0.01

type ModelPricing = {
  inputPerMillion: number
  outputPerMillion: number
}

const TIER_PRICING_USD_PER_MILLION: Record<GatewayModelTier, ModelPricing> = {
  fast: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  balanced: { inputPerMillion: 0.75, outputPerMillion: 3 },
  capable: { inputPerMillion: 3, outputPerMillion: 15 },
  open: { inputPerMillion: 0.2, outputPerMillion: 0.8 },
}

const TAVILY_CREDIT_USD = 0.01

export function roundCostUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function resolveModelPricing(modelId: string): ModelPricing {
  const tier =
    GATEWAY_MODEL_CATALOG.find((option) => option.id === modelId)?.tier ??
    "balanced"
  return TIER_PRICING_USD_PER_MILLION[tier]
}

function providerFromModelId(modelId: string): string {
  if (modelId.startsWith("@cf/")) return "cloudflare-workers-ai"
  const [provider] = modelId.split("/")
  return provider || "unknown"
}

export function estimateModelCostUsd(input: {
  model: string
  usage: RunUsage
  mockRuntime?: boolean
}): RunCostLineItem {
  if (input.mockRuntime) {
    return {
      category: "model",
      provider: "mock",
      model: input.model,
      promptTokens: input.usage.promptTokens,
      completionTokens: input.usage.completionTokens,
      costUsd: MOCK_MODEL_COST_USD,
    }
  }

  const pricing = resolveModelPricing(input.model)
  const promptTokens = input.usage.promptTokens ?? 0
  const completionTokens = input.usage.completionTokens ?? 0
  const costUsd = roundCostUsd(
    (promptTokens / 1_000_000) * pricing.inputPerMillion +
      (completionTokens / 1_000_000) * pricing.outputPerMillion
  )

  return {
    category: "model",
    provider: providerFromModelId(input.model),
    model: input.model,
    promptTokens,
    completionTokens,
    costUsd,
  }
}

export function estimateWebSearchCostUsd(input: {
  output: SearchWebOutput
  mockRuntime?: boolean
}): RunCostLineItem {
  if (input.mockRuntime) {
    return {
      category: "tool",
      provider: input.output.provider,
      toolName: "searchWeb",
      credits: 1,
      costUsd: MOCK_WEB_SEARCH_COST_USD,
    }
  }

  const credits =
    typeof input.output.metadata?.credits === "number"
      ? input.output.metadata.credits
      : 1

  return {
    category: "tool",
    provider: input.output.provider,
    toolName: "searchWeb",
    credits,
    costUsd: roundCostUsd(credits * TAVILY_CREDIT_USD),
  }
}

export function buildRunCostBreakdown(
  lineItems: RunCostLineItem[]
): RunCostBreakdown {
  const totalUsd = roundCostUsd(
    lineItems.reduce((total, item) => total + item.costUsd, 0)
  )
  return { totalUsd, lineItems }
}

export function buildCompletedRunCost(input: {
  model: string
  usage: RunUsage
  toolOutputs?: SearchWebOutput[]
  mockRuntime?: boolean
}): { costUsd: number; costBreakdown: RunCostBreakdown } {
  const lineItems: RunCostLineItem[] = [
    estimateModelCostUsd({
      model: input.model,
      usage: input.usage,
      mockRuntime: input.mockRuntime,
    }),
    ...(input.toolOutputs ?? []).map((output) =>
      estimateWebSearchCostUsd({ output, mockRuntime: input.mockRuntime })
    ),
  ]
  const costBreakdown = buildRunCostBreakdown(lineItems)
  return { costUsd: costBreakdown.totalUsd, costBreakdown }
}
