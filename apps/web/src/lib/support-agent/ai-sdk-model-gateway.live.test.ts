/// <reference types="node" />

import { describe, expect, test } from "vitest"

import { createAiSdkOpenAiTextGenerator } from "./ai-sdk-model-gateway"

const liveOpenAiApiKey = process.env.OPENAI_API_KEY
const liveModel = process.env.SUPPORT_AGENT_MODEL ?? "gpt-5.4-mini"
const liveTest = liveOpenAiApiKey ? test : test.skip

describe("support-agent AI SDK live gateway", () => {
  liveTest("calls the configured OpenAI model", async () => {
    const generateText = createAiSdkOpenAiTextGenerator()

    const result = await generateText({
      config: {
        provider: "openai",
        model: liveModel,
        apiKey: liveOpenAiApiKey ?? "",
      },
      system: "Answer as an Agentis support agent.",
      prompt: "Question: Reply with one short setup sentence.",
    })

    expect(result.text.trim().length).toBeGreaterThan(0)
  })
})
