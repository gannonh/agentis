import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"

import {
  createSupportAgentApiHandler,
  supportAgentApiPath,
  type SupportAgentServerEnv,
} from "./src/lib/support-agent/api-handler"

type SupportAgentMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void
) => void | Promise<void>

type SupportAgentMiddlewareHost = {
  middlewares: {
    use: (middleware: SupportAgentMiddleware) => void
  }
  config: {
    logger: {
      error: (message: string) => void
    }
  }
}

const maxSupportAgentDevRequestBodyBytes = 1_000_000

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Support agent dev request body exceeds 1000000 bytes.")
  }
}

export function supportAgentDevPlugin(env: SupportAgentServerEnv): Plugin {
  return {
    name: "agentis-support-agent-dev-api",
    configureServer(server) {
      registerSupportAgentMiddleware(env, server)
    },
    configurePreviewServer(server) {
      registerSupportAgentMiddleware(env, server)
    },
  }
}

function registerSupportAgentMiddleware(
  env: SupportAgentServerEnv,
  server: SupportAgentMiddlewareHost
) {
  const handler = createSupportAgentApiHandler({ env })

  server.middlewares.use(async (request, response, next) => {
    if (!isSupportAgentApiRequest(request.url)) {
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
    } catch (error) {
      server.config.logger.error(
        `Support agent dev endpoint failed.\n${formatError(error)}`
      )
      response.statusCode = error instanceof RequestBodyTooLargeError ? 413 : 500
      response.setHeader("Content-Type", "application/json")
      response.end(
        JSON.stringify({
          error: {
            message:
              error instanceof RequestBodyTooLargeError
                ? "Support agent dev request body is too large."
                : "Support agent dev endpoint failed.",
          },
        })
      )
    }
  })
}

function isSupportAgentApiRequest(requestUrl: string | undefined): boolean {
  if (!requestUrl) {
    return false
  }

  try {
    return (
      new URL(requestUrl, "http://localhost").pathname === supportAgentApiPath
    )
  } catch {
    return false
  }
}

function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const headerValue of value) {
        headers.append(key, headerValue)
      }
    }
  }

  return headers
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let receivedBytes = 0
    let rejected = false

    request.on("data", (chunk: Buffer | string) => {
      if (rejected) {
        return
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      receivedBytes += buffer.length

      if (receivedBytes > maxSupportAgentDevRequestBodyBytes) {
        rejected = true
        reject(new RequestBodyTooLargeError())
        return
      }

      chunks.push(buffer)
    })
    request.on("error", reject)
    request.on("end", () => {
      if (!rejected) {
        resolve(Buffer.concat(chunks).toString("utf8"))
      }
    })
  })
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`
  }

  return String(error)
}
