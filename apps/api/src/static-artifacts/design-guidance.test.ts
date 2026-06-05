import { describe, expect, it } from "vitest"
import {
  STATIC_ARTIFACT_FORMAT_GUIDANCE,
  STATIC_ARTIFACT_SHARED_THEME_SELECTORS,
  SLIDE_STATIC_ARTIFACT_THEMES,
  WEBPAGE_STATIC_ARTIFACT_THEMES,
  getStaticArtifactDesignGuidance,
  validateStaticArtifactTheme,
} from "./design-guidance.js"

describe("static artifact design guidance", () => {
  it("exposes webpage themes, slide themes, and shared selectors from the spec", () => {
    expect(WEBPAGE_STATIC_ARTIFACT_THEMES.map((theme) => theme.id)).toEqual([
      "editorial",
      "data",
      "developer",
      "design",
      "academic",
      "warm",
      "midnight",
      "terminal",
      "landing",
      "playful",
    ])
    expect(SLIDE_STATIC_ARTIFACT_THEMES.map((theme) => theme.id)).toEqual([
      "keynote",
      "pitch",
      "ted",
      "corporate",
      "workshop",
      "cinematic",
      "neon",
      "gallery",
      "infographic",
      "playful",
    ])
    expect(STATIC_ARTIFACT_SHARED_THEME_SELECTORS.map((theme) => theme.id)).toEqual([
      "auto",
      "surprise",
      "bespoke",
    ])
  })

  it("exposes format guidance for webpages, HTML slides, and polished image slides", () => {
    expect(STATIC_ARTIFACT_FORMAT_GUIDANCE["webpage:html"]).toContain(
      "Optimize for reading and scanning from top to bottom."
    )
    expect(STATIC_ARTIFACT_FORMAT_GUIDANCE["slides:html"]).toContain(
      "Include keyboard navigation, slide counter, and responsive full-screen layout."
    )
    expect(STATIC_ARTIFACT_FORMAT_GUIDANCE["slides:polishedImage"]).toContain(
      "Persist one image asset per slide plus slide ordering and metadata."
    )
  })

  it("returns bounded guidance and validates format-specific theme ids", () => {
    const guidance = getStaticArtifactDesignGuidance({
      artifactType: "slides",
      renderMode: "polishedImage",
      theme: "cinematic",
      bespokeStyleBrief:
        "Use cinematic black backgrounds with oversized product imagery and minimal text on every slide.",
    })

    expect(guidance.selectedTheme.id).toBe("cinematic")
    expect(guidance.formatGuidance).toContain(
      "Limit text density because slide text is rendered into images."
    )
    expect(guidance.bespokeStyleBriefSummary).toBe(
      "Use cinematic black backgrounds with oversized product imagery and minimal text on every slide."
    )

    expect(validateStaticArtifactTheme("webpage", "editorial").ok).toBe(true)
    expect(validateStaticArtifactTheme("slides", "keynote").ok).toBe(true)
    expect(validateStaticArtifactTheme("webpage", "keynote")).toEqual({
      ok: false,
      code: "static_artifact_invalid_type",
      message: "Theme keynote is not supported for webpage artifacts.",
    })
  })
})
