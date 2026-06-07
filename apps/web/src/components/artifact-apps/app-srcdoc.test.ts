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
    expect(srcDoc).toContain("window.App")
    expect(srcDoc).toContain(bundle.js)
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
