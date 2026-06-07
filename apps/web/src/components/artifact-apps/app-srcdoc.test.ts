import { describe, expect, it } from "vitest"
import { assembleAppSrcDoc, parseBundle } from "./app-srcdoc"

describe("app srcdoc assembly", () => {
  it("assembles bundle fragments into a sandboxed srcdoc document", () => {
    const bundle = {
      html: "<main><p id='count'>0</p></main>",
      css: "main { padding: 1rem; }",
      js: "document.getElementById('count').textContent = '1'",
    }
    const srcDoc = assembleAppSrcDoc({
      bundle,
      artifactId: "artifact_1",
      version: 1,
    })
    expect(srcDoc).toContain("data-agentis-app=\"artifact_1\"")
    expect(srcDoc).toContain("Content-Security-Policy")
    expect(srcDoc).toContain("connect-src 'none'")
    expect(srcDoc).toContain("window.App")
    expect(srcDoc).toContain(bundle.js)
  })

  it("injects css and csp when html has no head element", () => {
    const srcDoc = assembleAppSrcDoc({
      bundle: {
        html: "<html><body><main></main></body></html>",
        css: "main { color: red; }",
        js: "console.log('ready')",
      },
      artifactId: "artifact_2",
      version: 1,
    })
    expect(srcDoc).toContain("<head>")
    expect(srcDoc).toContain("Content-Security-Policy")
    expect(srcDoc).toContain("main { color: red; }")
  })

  it("does not treat header tags as head tags when injecting csp", () => {
    const srcDoc = assembleAppSrcDoc({
      bundle: {
        html: "<html><body><header>Title</header><main></main></body></html>",
        js: "console.log('ready')",
      },
      artifactId: "artifact_3",
      version: 1,
    })
    expect(srcDoc).toMatch(/<head>\s*<meta http-equiv="Content-Security-Policy"/i)
    expect(srcDoc).not.toMatch(/<header>\s*<meta http-equiv="Content-Security-Policy"/i)
  })

  it("injects bundle css when html already contains a style tag", () => {
    const srcDoc = assembleAppSrcDoc({
      bundle: {
        html: "<html><head><style>body { margin: 0; }</style></head><body><main></main></body></html>",
        css: "main { color: red; }",
        js: "console.log('ready')",
      },
      artifactId: "artifact_4",
      version: 1,
    })
    expect(srcDoc).toContain("body { margin: 0; }")
    expect(srcDoc).toContain("main { color: red; }")
    expect(srcDoc).toContain('data-agentis-app-css')
    expect(srcDoc).toContain("navigate-to 'none'")
  })

  it("parses stored bundle JSON", () => {
    expect(
      parseBundle(
        JSON.stringify({
          html: "<main></main>",
          js: "console.log('ready')",
        })
      )
    ).toEqual({
      html: "<main></main>",
      js: "console.log('ready')",
    })
  })
})
