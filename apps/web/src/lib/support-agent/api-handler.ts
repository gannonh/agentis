import { createAiSdkOpenAiTextGenerator } from "./ai-sdk-model-gateway"
import type { SupportAgentChatRequest } from "./chat-contracts"
import {
  createConfiguredSupportAgentRuntime,
  respondWithSupportAgentRuntime,
  toSupportAgentFailureState,
} from "./index"
import type { SupportAgentTextGenerator } from "./model-runtime"

export const supportAgentApiPath = "/api/support-agent/respond"

export type SupportAgentServerEnv = Record<string, string | undefined>

export type SupportAgentApiHandlerOptions = {
  env: SupportAgentServerEnv
  generateText?: SupportAgentTextGenerator
}

export function createSupportAgentApiHandler({
  env,
  generateText = createAiSdkOpenAiTextGenerator(),
}: SupportAgentApiHandlerOptions): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method !== "POST") {
      return jsonResponse(
        {
          error: {
            message: "Support agent endpoint requires POST.",
          },
        },
        405
      )
    }

    try {
      const chatRequest = (await request.json()) as SupportAgentChatRequest
      const runtime = createConfiguredSupportAgentRuntime({
        mode: "model",
        provider: {
          provider: env.SUPPORT_AGENT_PROVIDER ?? "openai",
          model: env.SUPPORT_AGENT_MODEL ?? "gpt-4o-mini",
          apiKey: env.OPENAI_API_KEY,
        },
        generateText,
      })
      const response = await respondWithSupportAgentRuntime(
        runtime,
        chatRequest
      )

      return jsonResponse(response, 200)
    } catch (error) {
      const failure = toSupportAgentFailureState(error)
      const message =
        error instanceof Error ? error.message : "Support agent request failed."

      return jsonResponse(
        {
          error: {
            runtimeCode: failure.runtimeCode,
            title: failure.title,
            userMessage: failure.userMessage,
            maintainerMessage: failure.maintainerMessage,
            message,
          },
        },
        500
      )
    }
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
