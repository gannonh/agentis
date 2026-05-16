import {
  createSupportAgentApiHandler,
  supportAgentApiPath,
} from "../lib/support-agent/api-handler"
import { createAiSdkOpenAiTextGenerator } from "../lib/support-agent/ai-sdk-model-gateway"
import type { SupportAgentTextGenerator } from "../lib/support-agent/model-runtime"

export type SupportAgentWorkerEnv = {
  SUPPORT_AGENT_OPENAI_API_KEY?: string
  SUPPORT_AGENT_DEPLOYMENT_SECRET?: string
  SUPPORT_AGENT_MODEL?: string
  SUPPORT_AGENT_PROVIDER?: string
}

export type SupportAgentWorkerOptions = {
  generateText?: SupportAgentTextGenerator
}

export function createSupportAgentWorkerFetch({
  generateText = createAiSdkOpenAiTextGenerator(),
}: SupportAgentWorkerOptions = {}): (
  request: Request,
  env: SupportAgentWorkerEnv
) => Promise<Response> {
  return async (request, env) => {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          service: "agentis-support-agent-preview",
        },
        200
      )
    }

    if (url.pathname === "/support-agent/chat") {
      return htmlResponse(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Agentis hosted support-agent web chat</title></head><body><main><h1>Agentis hosted support-agent web chat</h1><p data-api-path="${supportAgentApiPath}">Runtime API: ${supportAgentApiPath}</p></main></body></html>`,
        200
      )
    }

    if (url.pathname === supportAgentApiPath) {
      const handler = createSupportAgentApiHandler({
        env: {
          OPENAI_API_KEY: env.SUPPORT_AGENT_OPENAI_API_KEY,
          SUPPORT_AGENT_MODEL: env.SUPPORT_AGENT_MODEL,
          SUPPORT_AGENT_PROVIDER: env.SUPPORT_AGENT_PROVIDER,
        },
        generateText,
      })

      return handler(request)
    }

    return jsonResponse({ ok: false, error: "Not found" }, 404)
  }
}

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export default {
  fetch: createSupportAgentWorkerFetch(),
}
