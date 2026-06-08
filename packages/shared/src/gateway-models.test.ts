import { describe, expect, it } from "vitest"
import {
  DEFAULT_GATEWAY_MODEL,
  GATEWAY_MODEL_CATALOG,
  getGatewayModelsForProvider,
  isGatewayModelAvailableForProvider,
  resolveSelectableGatewayModel,
} from "./gateway-models.js"

describe("gateway model catalog", () => {
  it("uses a current default model", () => {
    expect(DEFAULT_GATEWAY_MODEL).toBe("openai/gpt-5.4-mini")
    expect(GATEWAY_MODEL_CATALOG.some((m) => m.id === DEFAULT_GATEWAY_MODEL)).toBe(
      true
    )
  })

  it("hides Workers AI models from the Vercel provider list", () => {
    const vercelIds = getGatewayModelsForProvider("vercel").map((m) => m.id)
    expect(vercelIds).not.toContain("@cf/moonshotai/kimi-k2.6")
    expect(vercelIds).toContain("anthropic/claude-sonnet-4.6")
  })

  it("includes Workers AI models for Cloudflare", () => {
    const cloudflareIds = getGatewayModelsForProvider("cloudflare").map(
      (m) => m.id
    )
    expect(cloudflareIds).toContain("@cf/moonshotai/kimi-k2.6")
    expect(cloudflareIds).toContain("@cf/zai-org/glm-4.7-flash")
  })

  it("resolves invalid selections to the provider default", () => {
    expect(
      resolveSelectableGatewayModel("@cf/moonshotai/kimi-k2.6", "vercel")
    ).toBe(DEFAULT_GATEWAY_MODEL)
    expect(
      resolveSelectableGatewayModel("anthropic/claude-sonnet-4.6", "cloudflare")
    ).toBe("anthropic/claude-sonnet-4.6")
  })

  it("flags Workers AI availability by provider", () => {
    expect(
      isGatewayModelAvailableForProvider("@cf/openai/gpt-oss-120b", "cloudflare")
    ).toBe(true)
    expect(
      isGatewayModelAvailableForProvider("@cf/openai/gpt-oss-120b", "vercel")
    ).toBe(false)
  })
})
