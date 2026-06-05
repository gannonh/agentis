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
      "<link rel=stylesheet href=https://evil.example/app.css>",
      "<link rel=\"preload stylesheet\" href=\"https://evil.example/app.css\">",
      "<link rel=\"alternate stylesheet\" href=\"https://evil.example/alternate.css\">",
      "<link rel='stylesheet preload' href=https://evil.example/app.css>",
      "<a href=/api/threads>Runtime link</a>",
      "<button formaction=\"/api/runs\">Go</button>",
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

  it("rejects external hrefs on link elements because they load network dependencies", () => {
    const cases = [
      '<link rel="preload" href="https://cdn.example/font.woff2" as="font">',
      '<link rel="modulepreload" href="https://cdn.example/app.js">',
      '<link rel="icon" href="https://cdn.example/favicon.ico">',
      '<link rel="preconnect" href="https://cdn.example">',
      '<link href="https&#x3a;//cdn.example/x.css">',
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

  it("rejects all dynamic imports in script bodies", () => {
    const cases = [
      '<script type="module">import("https://cdn.example/app.js")</script>',
      '<script type="module">import("https:" + "//cdn.example/app.js")</script>',
      '<script type="module">import("./local-module.js")</script>',
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

  it("rejects remote static module imports and re-exports in script bodies", () => {
    const cases = [
      '<script type="module">import app from "https://cdn.example/app.js"</script>',
      '<script type="module">export { app } from "https://cdn.example/app.js"</script>',
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

  it("rejects external resource loads in CSS, media, and SVG resource tags", () => {
    const cases = [
      "<style>@import url('https://cdn.example/theme.css');</style>",
      "<style>.hero{background-image:url(https://cdn.example/hero.png)}</style>",
      "<style>.hero{background-image:url(https&#x3a;//cdn.example/hero.png)}</style>",
      "<style>.hero{background-image:url(https\\3a //cdn.example/hero.png)}</style>",
      "<style>.hero{background-image:url(\\68ttps://cdn.example/hero.png)}</style>",
      "<section style=\"background:url('https://cdn.example/pattern.svg')\"></section>",
      "<section style=\"background:url(https\\3a //cdn.example/pattern.svg)\"></section>",
      "<section style=\"background:url(\\68ttps://cdn.example/pattern.svg)\"></section>",
      "<img src=\"https://cdn.example/photo.png\" alt=\"Remote\">",
      "<img src=\"https&#x3a;//cdn.example/x.png\" alt=\"Remote\">",
      "<img srcset=\"/local-small.png 1x, https://cdn.example/large.png 2x\" alt=\"Remote\">",
      "<source srcset=\"https://cdn.example/large.webp 800w\">",
      "<iframe src=\"https://cdn.example/embed\"></iframe>",
      "<video src=\"https://cdn.example/movie.mp4\"></video>",
      "<video poster=\"https://cdn.example/poster.png\"></video>",
      "<audio src=\"https://cdn.example/audio.mp3\"></audio>",
      "<input type=\"image\" src=\"https://cdn.example/button.png\" alt=\"Submit\">",
      "<track src=\"https://cdn.example/captions.vtt\" kind=\"captions\">",
      "<track src=\"https&#x3a;//cdn.example/c.vtt\">",
      "<object data=\"https://cdn.example/widget.svg\"></object>",
      "<embed src=\"https://cdn.example/widget.svg\">",
      '<svg><image href="https://cdn.example/x.png"></image></svg>',
      '<svg><image xlink:href="https://cdn.example/x.png"></image></svg>',
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

  it("allows local anchor hrefs while rejecting resource external hrefs", () => {
    expect(
      validateStaticHtml({
        artifactType: "webpage",
        renderMode: "html",
        html: '<main><a href="#section">Jump</a><section id="section">Local</section></main>',
        maxBytes: 2048,
      })
    ).toMatchObject({ ok: true })
  })

  it("rejects base tags because they can turn relative resource paths into network loads", () => {
    expect(
      validateStaticHtml({
        artifactType: "webpage",
        renderMode: "html",
        html: '<base href="https://cdn.example/"><img src="x.png">',
        maxBytes: 2048,
      })
    ).toMatchObject({ ok: false, code: "static_artifact_invalid_html" })
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
