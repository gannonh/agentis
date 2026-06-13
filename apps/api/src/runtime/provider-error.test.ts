import { describe, expect, it } from "vitest"
import { formatProviderErrorMessage } from "./provider-error.js"

describe("formatProviderErrorMessage", () => {
  it("extracts Cloudflare gateway error messages from response bodies", () => {
    const error = new Error("Bad Request") as Error & { responseBody?: string }
    error.responseBody = JSON.stringify({
      errors: [
        {
          message:
            "Model execution failed (User Input Error): Required value missing: max_tokens",
          code: 7003,
        },
      ],
    })

    expect(formatProviderErrorMessage(error)).toBe(
      "Model execution failed (User Input Error): Required value missing: max_tokens"
    )
  })

  it("falls back to the error message when no response body exists", () => {
    expect(formatProviderErrorMessage(new Error("Provider timeout"))).toBe(
      "Provider timeout"
    )
  })
})
