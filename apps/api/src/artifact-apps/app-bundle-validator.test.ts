import { describe, expect, it } from "vitest"
import { validateAppBundle } from "./app-bundle-validator.js"

describe("validateAppBundle", () => {
  it("accepts a minimal interactive bundle", () => {
    const result = validateAppBundle({
      html: "<main><h1>Counter</h1><p id='count'>0</p></main>",
      js: "document.getElementById('count').textContent = '1'",
      maxBytes: 10_000,
    })
    expect(result).toEqual({ ok: true, warnings: [] })
  })

  it("rejects bundles with external script tags", () => {
    const result = validateAppBundle({
      html: "<main></main>",
      js: "fetch('https://example.com')",
      maxBytes: 10_000,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_invalid_bundle")
  })

  it("rejects bundles that exceed size limits", () => {
    const result = validateAppBundle({
      html: "x".repeat(100),
      js: "y".repeat(200),
      maxBytes: 50,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_bundle_too_large")
  })

  it("rejects inline event handler attributes", () => {
    const result = validateAppBundle({
      html: "<button onclick=\"alert('x')\">Go</button>",
      js: "console.log('ready')",
      maxBytes: 10_000,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_invalid_bundle")
  })
})
