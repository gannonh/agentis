/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"
import type { ViteDevServer } from "vite"
import { describe, expect, it, vi } from "vitest"

import { supportAgentDevPlugin } from "../../../support-agent-dev-plugin"
import { supportAgentApiPath } from "./api-handler"

type SupportAgentMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void
) => void | Promise<void>

describe("supportAgentDevPlugin", () => {
  it("handles the exact support agent endpoint with a query string", async () => {
    const middleware = createMiddleware()
    const request = createRequest(`${supportAgentApiPath}?source=test`)
    const { body, end, response } = createResponse()
    const next = vi.fn()

    await middleware(request, response, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.statusCode).toBe(405)
    expect(end).toHaveBeenCalledOnce()
    expect(JSON.parse(body.value)).toEqual({
      error: {
        message: "Support agent endpoint requires POST.",
      },
    })
  })

  it("passes prefixed nonmatching support agent paths to the next middleware", async () => {
    const middleware = createMiddleware()
    const request = createRequest(`${supportAgentApiPath}-anything`)
    const { end, response } = createResponse()
    const next = vi.fn()

    await middleware(request, response, next)

    expect(next).toHaveBeenCalledOnce()
    expect(end).not.toHaveBeenCalled()
  })
})

function createMiddleware(): SupportAgentMiddleware {
  let middleware: SupportAgentMiddleware | undefined
  const plugin = supportAgentDevPlugin({})

  if (typeof plugin.configureServer !== "function") {
    throw new Error("Support agent dev plugin did not expose server middleware.")
  }

  const configureServer = plugin.configureServer as (
    server: ViteDevServer
  ) => void

  configureServer({
    middlewares: {
      use: (handler: SupportAgentMiddleware) => {
        middleware = handler
      },
    },
    config: {
      logger: {
        error: vi.fn(),
      },
    },
  } as unknown as ViteDevServer)

  if (!middleware) {
    throw new Error("Support agent dev plugin did not register middleware.")
  }

  return middleware
}

function createRequest(url: string): IncomingMessage {
  const request = Readable.from([]) as IncomingMessage
  request.url = url
  request.method = "GET"
  request.headers = {}

  return request
}

function createResponse(): {
  body: { value: string }
  end: ReturnType<typeof vi.fn>
  response: ServerResponse
} {
  const body = { value: "" }
  const end = vi.fn((chunk?: unknown) => {
    body.value = chunk?.toString() ?? ""
  })

  return {
    body,
    end,
    response: {
      statusCode: 200,
      setHeader: vi.fn(),
      end,
    } as unknown as ServerResponse,
  }
}
