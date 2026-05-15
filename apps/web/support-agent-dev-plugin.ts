import type { IncomingMessage } from "node:http"
import type { Plugin } from "vite"

import {
  createSupportAgentApiHandler,
  supportAgentApiPath,
  type SupportAgentServerEnv,
} from "./src/lib/support-agent/api-handler"

export function supportAgentDevPlugin(env: SupportAgentServerEnv): Plugin {
  return {
    name: "agentis-support-agent-dev-api",
    configureServer(server) {
      const handler = createSupportAgentApiHandler({ env })

      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith(supportAgentApiPath)) {
          next()
          return
        }

        try {
          const body = await readRequestBody(request)
          const apiResponse = await handler(
            new Request(`http://localhost${supportAgentApiPath}`, {
              method: request.method,
              headers: toHeaders(request),
              body: body.length > 0 ? body : undefined,
            })
          )

          response.statusCode = apiResponse.status
          apiResponse.headers.forEach((value, key) => {
            response.setHeader(key, value)
          })
          response.end(await apiResponse.text())
        } catch {
          server.config.logger.error("Support agent dev endpoint failed.")
          response.statusCode = 500
          response.setHeader("Content-Type", "application/json")
          response.end(
            JSON.stringify({
              error: {
                message: "Support agent dev endpoint failed.",
              },
            })
          )
        }
      })
    },
  }
}

function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers.set(key, value)
    }
  }

  return headers
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    request.on("data", (chunk: Buffer) => chunks.push(chunk))
    request.on("error", reject)
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
  })
}
