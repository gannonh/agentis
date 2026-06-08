import { z } from "zod"

export const gatewayModelTierSchema = z.enum([
  "fast",
  "balanced",
  "capable",
  "open",
])

export const gatewayModelOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  tier: gatewayModelTierSchema,
})

export type GatewayModelTier = z.infer<typeof gatewayModelTierSchema>
export type GatewayModelOption = z.infer<typeof gatewayModelOptionSchema>

export type AiGatewayProvider = "vercel" | "cloudflare"

/** Default for new threads when the client does not override. */
export const DEFAULT_GATEWAY_MODEL = "openai/gpt-5.4-mini"

/**
 * Curated Cloudflare AI Gateway models (REST `provider/model` and Workers `@cf/...`).
 * Source: https://developers.cloudflare.com/ai-gateway/supported-models/
 */
export const GATEWAY_MODEL_CATALOG: GatewayModelOption[] = [
  { id: "openai/gpt-5.4-nano", label: "GPT-5.4 Nano", tier: "fast" },
  {
    id: "google/gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    tier: "fast",
  },
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM 4.7 Flash (Workers AI)",
    tier: "fast",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    tier: "balanced",
  },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", tier: "balanced" },
  { id: "google/gemini-3-flash", label: "Gemini 3 Flash", tier: "balanced" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", tier: "capable" },
  { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", tier: "capable" },
  { id: "google/gemini-3.1-pro", label: "Gemini 3.1 Pro", tier: "capable" },
  { id: "openai/o4-mini", label: "o4-mini", tier: "open" },
  {
    id: "@cf/moonshotai/kimi-k2.6",
    label: "Kimi K2.6 (Workers AI)",
    tier: "open",
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    label: "gpt-oss-120b (Workers AI)",
    tier: "open",
  },
]

const WORKERS_AI_MODEL_PREFIX = "@cf/"

export function isWorkersAiGatewayModelId(modelId: string): boolean {
  return modelId.startsWith(WORKERS_AI_MODEL_PREFIX)
}

export function isGatewayModelAvailableForProvider(
  modelId: string,
  provider: AiGatewayProvider
): boolean {
  if (isWorkersAiGatewayModelId(modelId)) {
    return provider === "cloudflare"
  }
  return true
}

export function getGatewayModelsForProvider(
  provider: AiGatewayProvider
): GatewayModelOption[] {
  return GATEWAY_MODEL_CATALOG.filter((option) =>
    isGatewayModelAvailableForProvider(option.id, provider)
  )
}

export function resolveSelectableGatewayModel(
  modelId: string | undefined,
  provider: AiGatewayProvider
): string {
  const models = getGatewayModelsForProvider(provider)
  if (modelId && models.some((option) => option.id === modelId)) {
    return modelId
  }
  const defaultOption = models.find((option) => option.id === DEFAULT_GATEWAY_MODEL)
  return defaultOption?.id ?? models[0]?.id ?? DEFAULT_GATEWAY_MODEL
}

export const GATEWAY_MODEL_TIER_LABELS: Record<GatewayModelTier, string> = {
  fast: "Fast",
  balanced: "Balanced",
  capable: "Capable",
  open: "Open / Workers AI",
}
