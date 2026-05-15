/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"
import type { PreviewServer, ViteDevServer } from "vite"
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

  it("registers the same support agent middleware for preview", async () => {
    const middleware = createMiddleware("preview")
    const request = createRequest(`${supportAgentApiPath}?source=preview`)
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

  it("rejects oversized support agent request bodies", async () => {
    const middleware = createMiddleware()
    const request = createRequest(supportAgentApiPath, {
      method: "POST",
      body: "x".repeat(1_000_001),
    })
    const { body, response } = createResponse()
    const next = vi.fn()

    await middleware(request, response, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.statusCode).toBe(413)
    expect(JSON.parse(body.value)).toEqual({
      error: {
        message: "Support agent dev request body is too large.",
      },
    })
  })

  it("logs middleware failures with error details", async () => {
    const { logger, middleware } = createMiddlewareContext()
    const request = createFailingRequest(supportAgentApiPath, new Error("stream broke"))
    const { body, response } = createResponse()
    const next = vi.fn()

    await middleware(request, response, next)

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(body.value)).toEqual({
      error: {
        message: "Support agent dev endpoint failed.",
      },
    })
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Support agent dev endpoint failed.\nError: stream broke")
    )
  })
})

function createMiddleware(
  mode: "dev" | "preview" = "dev"
): SupportAgentMiddleware {
  return createMiddlewareContext(mode).middleware
}

function createMiddlewareContext(mode: "dev" | "preview" = "dev"): {
  logger: { error: ReturnType<typeof vi.fn> }
  middleware: SupportAgentMiddleware
} {
  let middleware: SupportAgentMiddleware | undefined
  const plugin = supportAgentDevPlugin({})
  const logger = { error: vi.fn() }
  const server = {
    middlewares: {
      use: (handler: SupportAgentMiddleware) => {
        middleware = handler
      },
    },
    config: {
      logger,
    },
  }

  if (mode === "preview") {
    if (typeof plugin.configurePreviewServer !== "function") {
      throw new Error(
        "Support agent dev plugin did not expose preview middleware."
      )
    }

    const configurePreviewServer = plugin.configurePreviewServer as (
      server: PreviewServer
    ) => void

    configurePreviewServer(server as unknown as PreviewServer)
  } else {
    if (typeof plugin.configureServer !== "function") {
      throw new Error("Support agent dev plugin did not expose server middleware.")
    }

    const configureServer = plugin.configureServer as (
      server: ViteDevServer
    ) => void

    configureServer(server as unknown as ViteDevServer)
  }

  if (!middleware) {
    throw new Error("Support agent dev plugin did not register middleware.")
  }

  return { logger, middleware }
}

function createRequest(
  url: string,
  options: { body?: string; method?: string } = {}
): IncomingMessage {
  const request = Readable.from(
    options.body ? [Buffer.from(options.body)] : []
  ) as IncomingMessage
  request.url = url
  request.method = options.method ?? "GET"
  request.headers = {}

  return request
}

function createFailingRequest(url: string, error: Error): IncomingMessage {
  const request = new Readable({
    read() {
      this.destroy(error)
    },
  }) as IncomingMessage
  request.url = url
  request.method = "POST"
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
