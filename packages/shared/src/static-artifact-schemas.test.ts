import { describe, expect, it } from "vitest"
import {
  artifactTypeSchema,
  createStaticArtifactInputSchema,
  createStaticArtifactOutputSchema,
  documentTypeSchema,
  editStaticArtifactInputSchema,
  editStaticArtifactOutputSchema,
  findStaticArtifactsInputSchema,
  findStaticArtifactsOutputSchema,
  staticArtifactMetadataSchema,
  staticArtifactThemeSchema,
  validateStaticArtifactMode,
} from "./schemas.js"

describe("static artifact schemas", () => {
  it("parses documented create, edit, and find tool contracts", () => {
    const createInput = createStaticArtifactInputSchema.parse({
      title: "Launch narrative",
      description: "A static generated report",
      artifactType: "webpage",
      renderMode: "html",
      contentBrief: "Summarize the launch plan.",
      audience: "Product team",
      purpose: "Planning",
      theme: "editorial",
      bespokeStyleBrief: "Use restrained executive report styling.",
      sourceData: "Milestone A: complete.",
      visibilityScope: "project",
    })

    expect(createInput).toMatchObject({
      artifactType: "webpage",
      renderMode: "html",
      theme: "editorial",
      visibilityScope: "project",
    })

    expect(
      createStaticArtifactOutputSchema.parse({
        artifactId: "artifact-1",
        title: "Launch narrative",
        artifactType: "webpage",
        renderMode: "html",
        version: 1,
        viewPath: "/artifacts/artifact-1",
        downloadPath: "/api/artifacts/artifact-1/download",
        theme: "editorial",
        summary: "Created a static launch narrative webpage.",
      }).viewPath
    ).toBe("/artifacts/artifact-1")

    expect(
      editStaticArtifactInputSchema.parse({
        artifactId: "artifact-1",
        contentBrief: "Refresh the launch risk section.",
        changeSummary: "Updated risks",
        theme: "midnight",
      }).changeSummary
    ).toBe("Updated risks")

    expect(
      editStaticArtifactOutputSchema.parse({
        artifactId: "artifact-1",
        title: "Launch narrative",
        artifactType: "webpage",
        renderMode: "html",
        version: 2,
        previousVersion: 1,
        viewPath: "/artifacts/artifact-1",
        summary: "Updated the risk section.",
      }).previousVersion
    ).toBe(1)

    expect(
      findStaticArtifactsInputSchema.parse({
        query: "launch",
        artifactType: "slides",
        renderMode: "polishedImage",
        visibilityScope: "project",
        limit: 5,
      }).limit
    ).toBe(5)

    expect(
      findStaticArtifactsOutputSchema.parse({
        items: [
          {
            artifactId: "artifact-2",
            title: "Launch deck",
            artifactType: "slides",
            renderMode: "html",
            version: 1,
            viewPath: "/artifacts/artifact-2",
            theme: "keynote",
            updatedAt: "2026-06-05T00:00:00.000Z",
          },
        ],
        resultCount: 1,
        truncated: false,
      }).items[0]?.artifactType
    ).toBe("slides")
  })

  it("rejects invalid render mode combinations", () => {
    expect(validateStaticArtifactMode("webpage", "html").ok).toBe(true)
    expect(validateStaticArtifactMode("slides", "html").ok).toBe(true)
    expect(validateStaticArtifactMode("slides", "polishedImage").ok).toBe(true)
    expect(validateStaticArtifactMode("webpage", "polishedImage")).toEqual({
      ok: false,
      code: "static_artifact_invalid_render_mode",
      message: "polishedImage render mode is only supported for slides artifacts.",
    })

    expect(() =>
      createStaticArtifactInputSchema.parse({
        title: "Image webpage",
        artifactType: "webpage",
        renderMode: "polishedImage",
        contentBrief: "Create a visual page.",
      })
    ).toThrow(/polishedImage/)

    expect(() =>
      findStaticArtifactsInputSchema.parse({
        artifactType: "webpage",
        renderMode: "polishedImage",
      })
    ).toThrow(/polishedImage/)
  })

  it("keeps webpages and slides as Artifact siblings, not Document types", () => {
    expect(artifactTypeSchema.parse("webpage")).toBe("webpage")
    expect(artifactTypeSchema.parse("slides")).toBe("slides")
    expect(() => documentTypeSchema.parse("webpage")).toThrow()
    expect(() => documentTypeSchema.parse("slides")).toThrow()
  })

  it("parses static artifact metadata for webpage and slide outputs", () => {
    const metadata = staticArtifactMetadataSchema.parse({
      artifactType: "slides",
      renderMode: "polishedImage",
      theme: "cinematic",
      bespokeStyleBriefSummary: "Use bold launch visuals with minimal text.",
      generationPath: "polishedImageSlides",
      slideCount: 3,
      assetReferences: [
        {
          assetId: "asset-1",
          slideIndex: 0,
          storageKey: "artifacts/artifact-1/v1/slide-1.png",
          mimeType: "image/png",
          sizeBytes: 2048,
          altText: "Opening title slide",
        },
      ],
      provider: "mock-image-provider",
      providerModel: "mock-slide-v1",
      safetyValidationResult: {
        status: "passed",
        checkedAt: "2026-06-05T00:00:00.000Z",
        warnings: [],
      },
      generationWarnings: ["Slide 2 text was shortened for legibility."],
    })

    expect(metadata.assetReferences[0]?.slideIndex).toBe(0)
    expect(metadata.safetyValidationResult.status).toBe("passed")
    expect(staticArtifactThemeSchema.parse("surprise")).toBe("surprise")
  })
})
