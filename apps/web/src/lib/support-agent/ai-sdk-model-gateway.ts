import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

import type { SupportAgentTextGenerator } from "./model-runtime"

export function createAiSdkOpenAiTextGenerator(): SupportAgentTextGenerator {
  return async ({ config, system, prompt }) => {
    const openai = createOpenAI({ apiKey: config.apiKey })
    const result = await generateText({
      model: openai(config.model),
      system,
      prompt,
    })

    return {
      text: result.text,
    }
  }
}
