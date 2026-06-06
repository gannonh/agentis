import { fireEvent, render, screen } from "@testing-library/react"
import type { ArtifactDetailResponse } from "@workspace/shared"
import { StaticArtifactPreview } from "./static-artifact-preview"

const now = new Date().toISOString()

function detail(overrides: Partial<ArtifactDetailResponse>): ArtifactDetailResponse {
  return {
    artifact: {
      id: "artifact_static",
      title: "Launch artifact",
      type: "webpage",
      contentFormat: "html",
      mimeType: "text/html",
      sizeBytes: 120,
      visibilityScope: "global",
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {
        artifactType: "webpage",
        renderMode: "html",
        theme: "landing",
        generationPath: "modelHtml",
        assetReferences: [],
        safetyValidationResult: { status: "passed", warnings: [], errors: [] },
        generationWarnings: [],
      },
    },
    content: "<main><h1>Launch</h1></main>",
    truncated: false,
    selectedVersion: 1,
    currentVersion: 1,
    versions: [{ id: "version_1", version: 1, createdAt: now }],
    ...overrides,
  }
}

describe("StaticArtifactPreview", () => {
  it("renders webpage HTML in a scrollable sandbox without script access", () => {
    render(
      <StaticArtifactPreview
        detail={detail({
          artifact: {
            ...detail({}).artifact,
            type: "webpage",
            title: "Launch page",
          },
          content: "<main><h1>Launch</h1><script>window.evil=true</script></main>",
        })}
      />
    )

    const frame = screen.getByTitle("Launch page static webpage")
    expect(frame).toHaveAttribute("sandbox", "")
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("Launch"))
    expect(screen.getByText("Scrollable static webpage preview")).toBeInTheDocument()
  })

  it("renders HTML slide decks with owned controls in the script sandbox", () => {
    const html = `<!doctype html><section class="slide"><h1>One</h1></section><section class="slide"><h1>Two</h1></section>`
    render(
      <StaticArtifactPreview
        detail={detail({
          artifact: {
            ...detail({}).artifact,
            id: "slides_html",
            title: "Sales deck",
            type: "slides",
            metadata: {
              artifactType: "slides",
              renderMode: "html",
              theme: "pitch",
              generationPath: "modelDeckHtml",
              slideCount: 2,
              assetReferences: [],
              safetyValidationResult: { status: "passed", warnings: [], errors: [] },
              generationWarnings: [],
            },
          },
          content: html,
        })}
      />
    )

    const frame = screen.getByTitle("Sales deck HTML slide deck")
    expect(frame).toHaveAttribute("sandbox", "allow-scripts")
    expect(frame).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("data-agentis-slide-preview-shell")
    )
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("slide-counter"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("data-slide-prev"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("data-slide-next"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("Previous slide"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("Next slide"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("addEventListener('click'"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("keydown"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("<h1>One</h1>"))
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("<h1>Two</h1>"))
    expect(screen.getByText("Slide controls run inside an isolated static preview."))
      .toBeInTheDocument()
  })

  it("renders polished image decks from persisted asset metadata with keyboard navigation", () => {
    render(
      <StaticArtifactPreview
        detail={detail({
          artifact: {
            ...detail({}).artifact,
            id: "slides_polished",
            title: "Visual deck",
            type: "slides",
            contentFormat: "manifest",
            mimeType: "application/json",
            metadata: {
              artifactType: "slides",
              renderMode: "polishedImage",
              theme: "cinematic",
              generationPath: "polishedImageSlides",
              slideCount: 2,
              provider: "mock-image",
              assetReferences: [
                {
                  assetId: "asset_intro",
                  slideIndex: 1,
                  storageKey: "hidden/intro.png",
                  mimeType: "image/png",
                  sizeBytes: 10,
                  altText: "Intro slide",
                },
                {
                  assetId: "asset_close",
                  slideIndex: 2,
                  storageKey: "hidden/close.png",
                  mimeType: "image/png",
                  sizeBytes: 10,
                  altText: "Closing slide",
                },
              ],
              safetyValidationResult: { status: "passed", warnings: [], errors: [] },
              generationWarnings: [],
            },
          },
          content: "{}",
        })}
      />
    )

    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByAltText("Intro slide")).toHaveAttribute(
      "src",
      "/api/artifacts/slides_polished/assets/asset_intro"
    )

    fireEvent.keyDown(screen.getByRole("region", { name: "Polished image slide deck" }), {
      key: "ArrowRight",
    })

    expect(screen.getByText("2 / 2")).toBeInTheDocument()
    expect(screen.getByAltText("Closing slide")).toHaveAttribute(
      "src",
      "/api/artifacts/slides_polished/assets/asset_close"
    )
  })

  it("shows provider unavailable and missing asset states for polished image decks", () => {
    const unavailable = detail({
      artifact: {
        ...detail({}).artifact,
        id: "slides_unavailable",
        title: "Unavailable deck",
        type: "slides",
        contentFormat: "manifest",
        mimeType: "application/json",
        metadata: {
          artifactType: "slides",
          renderMode: "polishedImage",
          theme: "cinematic",
          generationPath: "polishedImageSlides",
          slideCount: 1,
          assetReferences: [],
          safetyValidationResult: {
            status: "failed",
            warnings: [],
            errors: ["static_artifact_provider_unavailable"],
          },
          generationWarnings: ["Image provider unavailable"],
        },
      },
      content: "{}",
    })
    const { rerender } = render(<StaticArtifactPreview detail={unavailable} />)
    expect(screen.getByText("static_artifact_provider_unavailable")).toBeInTheDocument()

    rerender(
      <StaticArtifactPreview
        detail={detail({
          artifact: {
            ...unavailable.artifact,
            id: "slides_missing",
            metadata: {
              ...(unavailable.artifact.metadata as Record<string, unknown>),
              assetReferences: [
                {
                  assetId: "asset_missing",
                  slideIndex: 1,
                  storageKey: "hidden/missing.png",
                  mimeType: "image/png",
                  sizeBytes: 10,
                },
              ],
              safetyValidationResult: { status: "passed", warnings: [], errors: [] },
              generationWarnings: [],
            },
          },
        })}
      />
    )

    fireEvent.error(screen.getByRole("img"))
    expect(screen.getByText("static_artifact_asset_missing")).toBeInTheDocument()
  })
})
