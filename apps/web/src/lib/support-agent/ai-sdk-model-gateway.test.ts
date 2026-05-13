import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { describe, expect, test, vi } from "vitest"

import { createAiSdkOpenAiTextGenerator } from "./ai-sdk-model-gateway"
import type { SupportAgentProviderConfig } from "./provider-config"

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({ text: "Model-backed answer" })),
}))

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(({ apiKey }: { apiKey: string }) => {
    return (model: string) => ({ provider: "openai", model, apiKey })
  }),
}))

describe("support-agent AI SDK model gateway", () => {
  test("calls the selected OpenAI model through the AI SDK", async () => {
    const config: SupportAgentProviderConfig = {
      provider: "openai",
      model: "gpt-4.1-mini",
      apiKey: "sk-runtime-test",
    }
    const generate = createAiSdkOpenAiTextGenerator()

    const result = await generate({
      config,
      system: "Answer as an Agentis support agent.",
      prompt: "Question: How do I connect a knowledge source?",
    })

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "sk-runtime-test" })
    expect(generateText).toHaveBeenCalledWith({
      model: {
        provider: "openai",
        model: "gpt-4.1-mini",
        apiKey: "sk-runtime-test",
      },
      system: "Answer as an Agentis support agent.",
      prompt: "Question: How do I connect a knowledge source?",
    })
    expect(result).toEqual({ text: "Model-backed answer" })
  })
})
