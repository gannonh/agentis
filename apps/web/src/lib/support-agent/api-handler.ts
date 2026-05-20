import { createAiSdkOpenAiTextGenerator } from "./ai-sdk-model-gateway"
import type { SupportAgentChatRequest } from "./chat-contracts"
import {
  createConfiguredSupportAgentRuntime,
  respondWithSupportAgentRuntime,
  toSupportAgentFailureState,
} from "./index"
import type { SupportAgentTextGenerator } from "./model-runtime"
import { toBrowserSafeSupportAgentApiError } from "./browser-safe-error"

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
      const requestBody = await request.json()

      if (!isSupportAgentChatRequest(requestBody)) {
        return jsonResponse(
          {
            error: {
              message: "Support agent request body is invalid.",
            },
          },
          400
        )
      }

      const chatRequest = requestBody
      const runtime = createConfiguredSupportAgentRuntime({
        mode: "model",
        provider: {
          provider: env.SUPPORT_AGENT_PROVIDER ?? "openai",
          model: env.SUPPORT_AGENT_MODEL ?? "gpt-5.4-mini",
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

      return jsonResponse(
        {
          error: toBrowserSafeSupportAgentApiError(failure),
        },
        500
      )
    }
  }
}

function isSupportAgentChatRequest(
  request: unknown
): request is SupportAgentChatRequest {
  if (!request || typeof request !== "object") {
    return false
  }

  const candidate = request as Partial<SupportAgentChatRequest>

  return (
    typeof candidate.agentId === "string" &&
    typeof candidate.conversationId === "string" &&
    typeof candidate.messageId === "string" &&
    typeof candidate.question === "string" &&
    Array.isArray(candidate.knowledgeSourceIds) &&
    candidate.knowledgeSourceIds.every((sourceId) => typeof sourceId === "string") &&
    Array.isArray(candidate.knowledgeSources)
  )
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
