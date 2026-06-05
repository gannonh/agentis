import { describe, expect, it } from "vitest"
import { validateStaticHtml } from "./static-html-validator.js"

describe("static HTML validator", () => {
  it("accepts bounded static webpage and slide HTML", () => {
    expect(
      validateStaticHtml({
        artifactType: "webpage",
        renderMode: "html",
        html: "<main><h1>Launch</h1><p>Static content</p></main>",
        maxBytes: 1024,
      })
    ).toMatchObject({ ok: true })

    expect(
      validateStaticHtml({
        artifactType: "slides",
        renderMode: "html",
        html: "<section class=\"slide\"><h1>One</h1></section><script>document.addEventListener('keydown',()=>{})</script>",
        maxBytes: 1024,
      })
    ).toMatchObject({ ok: true })
  })

  it("allows static prose that mentions Agentis API paths without executing them", () => {
    expect(
      validateStaticHtml({
        artifactType: "webpage",
        renderMode: "html",
        html: "<main><p>Agentis API routes such as /api/health are documentation text.</p></main>",
        maxBytes: 1024,
      })
    ).toMatchObject({ ok: true })
  })

  it("rejects unsafe runtime behavior and unapproved network dependencies", () => {
    const cases = [
      "<script src=\"https://evil.example/app.js\"></script>",
      "<link rel=\"stylesheet\" href=\"https://evil.example/app.css\">",
      "<button onclick=\"alert(1)\">Run</button>",
      "<script>fetch('/api/threads')</script>",
      "<script>new XMLHttpRequest()</script>",
      "<script>new WebSocket('wss://example.com')</script>",
      "<script>new EventSource('/events')</script>",
      "<script>localStorage.setItem('x','y')</script>",
      "<script>window.agentis.runtime.callTool()</script>",
    ]

    for (const html of cases) {
      expect(
        validateStaticHtml({
          artifactType: "webpage",
          renderMode: "html",
          html,
          maxBytes: 2048,
        })
      ).toMatchObject({ ok: false, code: "static_artifact_invalid_html" })
    }
  })

  it("rejects invalid mode combinations and oversized bundles", () => {
    expect(
      validateStaticHtml({
        artifactType: "webpage",
        renderMode: "polishedImage",
        html: "<main></main>",
        maxBytes: 2048,
      })
    ).toMatchObject({
      ok: false,
      code: "static_artifact_invalid_render_mode",
    })

    expect(
      validateStaticHtml({
        artifactType: "slides",
        renderMode: "html",
        html: "x".repeat(16),
        maxBytes: 8,
      })
    ).toMatchObject({ ok: false, code: "static_artifact_bundle_too_large" })
  })
})
