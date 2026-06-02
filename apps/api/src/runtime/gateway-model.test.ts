import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createGatewayLanguageModel,
  resolveGatewayModelId,
} from "./gateway-model.js"
import { loadConfig } from "../config.js"

const aiMocks = vi.hoisted(() => {
  const gateway = vi.fn((modelId: string) => ({ provider: "gateway", modelId }))
  const createGateway = vi.fn(() => gateway)
  return { createGateway, gateway }
})

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>()
  return {
    ...actual,
    createGateway: aiMocks.createGateway,
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("Gateway model resolution", () => {
  it("keeps Gateway model ids unchanged", () => {
    expect(resolveGatewayModelId("openai/gpt-4o-mini")).toBe(
      "openai/gpt-4o-mini"
    )
  })

  it("maps legacy OpenAI model ids to Gateway ids", () => {
    expect(resolveGatewayModelId("gpt-4o-mini")).toBe("openai/gpt-4o-mini")
    expect(resolveGatewayModelId("gpt-4.1-mini")).toBe("openai/gpt-4.1-mini")
  })

  it("rejects empty model ids", () => {
    expect(() => resolveGatewayModelId("   ")).toThrow("Model id is required")
  })

  it("rejects unsupported unprefixed model ids", () => {
    expect(() => resolveGatewayModelId("claude-sonnet-4")).toThrow(
      "Gateway model ids must include a provider prefix"
    )
  })

  it("creates Gateway language models with the Gateway credential", () => {
    const model = createGatewayLanguageModel(
      loadConfig({ AI_GATEWAY_API_KEY: "gateway-key" }),
      "gpt-4o-mini"
    )

    expect(aiMocks.createGateway).toHaveBeenCalledWith({
      apiKey: "gateway-key",
    })
    expect(aiMocks.gateway).toHaveBeenCalledWith("openai/gpt-4o-mini")
    expect(model).toEqual({
      provider: "gateway",
      modelId: "openai/gpt-4o-mini",
    })
  })

  it("fails loudly when Gateway credentials are missing", () => {
    expect(() =>
      createGatewayLanguageModel(loadConfig({}), "openai/gpt-4o-mini")
    ).toThrow("AI_GATEWAY_API_KEY is not configured")
  })
})
