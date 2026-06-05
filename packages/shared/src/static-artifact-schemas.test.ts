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
          slideIndex: 1,
          storageKey: "artifacts/artifact-1/v1/slide-1.png",
          mimeType: "image/png",
          sizeBytes: 2048,
          altText: "Opening title slide",
        },
        {
          assetId: "asset-2",
          slideIndex: 2,
          storageKey: "artifacts/artifact-1/v1/slide-2.png",
          mimeType: "image/png",
          sizeBytes: 2048,
          altText: "Middle slide",
        },
        {
          assetId: "asset-3",
          slideIndex: 3,
          storageKey: "artifacts/artifact-1/v1/slide-3.png",
          mimeType: "image/png",
          sizeBytes: 2048,
          altText: "Closing slide",
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

    expect(metadata.assetReferences.map((asset) => asset.slideIndex)).toEqual([
      1, 2, 3,
    ])
    expect(metadata.safetyValidationResult.status).toBe("passed")
    expect(staticArtifactThemeSchema.parse("surprise")).toBe("surprise")

    expect(
      staticArtifactMetadataSchema.parse({
        artifactType: "webpage",
        renderMode: "html",
        theme: "editorial",
        generationPath: "modelHtml",
        safetyValidationResult: { status: "passed" },
      }).generationPath
    ).toBe("modelHtml")

    expect(
      staticArtifactMetadataSchema.parse({
        artifactType: "slides",
        renderMode: "html",
        theme: "keynote",
        generationPath: "modelDeckHtml",
        slideCount: 2,
        safetyValidationResult: { status: "passed" },
      }).slideCount
    ).toBe(2)

    expect(
      staticArtifactMetadataSchema.parse({
        artifactType: "slides",
        renderMode: "html",
        theme: "keynote",
        generationPath: "modelDeckHtml",
        safetyValidationResult: { status: "passed" },
      }).slideCount
    ).toBeUndefined()
  })

  it("rejects static artifact metadata that conflicts with render mode", () => {
    const baseMetadata = {
      theme: "cinematic",
      safetyValidationResult: { status: "passed" },
    }

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "slides",
        renderMode: "polishedImage",
        generationPath: "modelHtml",
      })
    ).toThrow(/polished image slides require polishedImageSlides generationPath/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "slides",
        renderMode: "polishedImage",
        generationPath: "polishedImageSlides",
        slideCount: 2,
      })
    ).toThrow(/polished image slides require one asset reference per slide/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "webpage",
        renderMode: "html",
        generationPath: "modelDeckHtml",
      })
    ).toThrow(/HTML webpages require modelHtml generationPath/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "webpage",
        renderMode: "html",
        generationPath: "modelHtml",
        slideCount: 1,
      })
    ).toThrow(/webpage metadata must not include slideCount/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "webpage",
        renderMode: "html",
        generationPath: "modelHtml",
        assetReferences: [
          {
            assetId: "asset-1",
            slideIndex: 1,
            storageKey: "artifacts/artifact-1/v1/slide-1.png",
            mimeType: "image/png",
            sizeBytes: 2048,
          },
        ],
      })
    ).toThrow(/webpage metadata must not include asset references/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "slides",
        renderMode: "html",
        generationPath: "modelHtml",
      })
    ).toThrow(/HTML slides require modelDeckHtml generationPath/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...baseMetadata,
        artifactType: "slides",
        renderMode: "html",
        generationPath: "modelDeckHtml",
        slideCount: 0,
      })
    ).toThrow()
  })

  it("requires polished image slide assets to cover each declared slide exactly once", () => {
    const polishedSlides = {
      artifactType: "slides",
      renderMode: "polishedImage",
      theme: "cinematic",
      generationPath: "polishedImageSlides",
      slideCount: 2,
      safetyValidationResult: { status: "passed" },
    } as const

    const firstSlideAsset = {
      assetId: "asset-1",
      slideIndex: 1,
      storageKey: "artifacts/artifact-1/v1/slide-1.png",
      mimeType: "image/png",
      sizeBytes: 2048,
    }

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...polishedSlides,
        assetReferences: [{ ...firstSlideAsset, slideIndex: 0 }],
      })
    ).toThrow(
      /polished image slide asset indexes must be between 1 and slideCount/i
    )

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...polishedSlides,
        assetReferences: [
          firstSlideAsset,
          { ...firstSlideAsset, assetId: "asset-2" },
        ],
      })
    ).toThrow(
      /polished image slide asset indexes must not contain duplicates/i
    )

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...polishedSlides,
        assetReferences: [firstSlideAsset],
      })
    ).toThrow(/polished image slides require one asset reference per slide/i)

    expect(() =>
      staticArtifactMetadataSchema.parse({
        ...polishedSlides,
        assetReferences: [
          firstSlideAsset,
          { ...firstSlideAsset, assetId: "asset-3", slideIndex: 3 },
        ],
      })
    ).toThrow(
      /polished image slide asset indexes must be between 1 and slideCount/i
    )
  })

  it("requires bespoke style briefs when tool inputs select the bespoke theme", () => {
    expect(() =>
      createStaticArtifactInputSchema.parse({
        title: "Bespoke page",
        artifactType: "webpage",
        renderMode: "html",
        contentBrief: "Create a custom page.",
        theme: "bespoke",
      })
    ).toThrow(/bespokeStyleBrief is required when theme is bespoke/i)

    expect(
      createStaticArtifactInputSchema.parse({
        title: "Bespoke page",
        artifactType: "webpage",
        renderMode: "html",
        contentBrief: "Create a custom page.",
        theme: "bespoke",
        bespokeStyleBrief: "Use a sparse editorial layout.",
      }).bespokeStyleBrief
    ).toBe("Use a sparse editorial layout.")

    expect(() =>
      editStaticArtifactInputSchema.parse({
        artifactId: "artifact-1",
        contentBrief: "Refresh the style.",
        changeSummary: "Restyled",
        theme: "bespoke",
        bespokeStyleBrief: "   ",
      })
    ).toThrow(/bespokeStyleBrief is required when theme is bespoke/i)
  })
})
