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

  it("rejects script tag terminators in bundle source", () => {
    const result = validateAppBundle({
      html: "<main></main>",
      js: "const x = '</script>'",
      maxBytes: 10_000,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_invalid_bundle")
  })

  it("allows common javascript handler variable names", () => {
    const result = validateAppBundle({
      html: "<main></main>",
      js: "const onChange = () => {}; const onClick = () => {};",
      maxBytes: 10_000,
    })
    expect(result).toEqual({ ok: true, warnings: [] })
  })

  it("rejects protocol-relative fetch URLs", () => {
    const result = validateAppBundle({
      html: "<main></main>",
      js: "fetch('//example.com/data')",
      maxBytes: 10_000,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_invalid_bundle")
  })

  it("rejects custom content security policy meta tags", () => {
    expect(
      validateAppBundle({
        html: '<html><head><meta http-equiv="Content-Security-Policy" content="connect-src *"></head></html>',
        js: "console.log('ready')",
        maxBytes: 10_000,
      }).ok
    ).toBe(false)
    expect(
      validateAppBundle({
        html: '<html><head><meta content="connect-src *" http-equiv="Content-Security-Policy"></head></html>',
        js: "console.log('ready')",
        maxBytes: 10_000,
      }).ok
    ).toBe(false)
  })

  it("rejects sendBeacon usage", () => {
    const result = validateAppBundle({
      html: "<main></main>",
      js: "navigator.sendBeacon('https://example.com', 'x')",
      maxBytes: 10_000,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_invalid_bundle")
  })
})
