import { z } from "zod"
import { artifactVisibilityScopeSchema } from "./artifact-schemas.js"

const nonEmptyString = z.string().trim().min(1)
const positiveInteger = z.number().int().positive()
const nonNegativeInteger = z.number().int().nonnegative()

export const staticArtifactTypeSchema = z.enum(["webpage", "slides"])
export const staticArtifactRenderModeSchema = z.enum(["html", "polishedImage"])

export const webpageStaticArtifactThemeSchema = z.enum([
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

export const slideStaticArtifactThemeSchema = z.enum([
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

export const sharedStaticArtifactThemeSelectorSchema = z.enum([
  "auto",
  "surprise",
  "bespoke",
])

export const staticArtifactThemeSchema = z.union([
  webpageStaticArtifactThemeSchema,
  slideStaticArtifactThemeSchema,
  sharedStaticArtifactThemeSelectorSchema,
])

export const staticArtifactGenerationPathSchema = z.enum([
  "modelHtml",
  "modelDeckHtml",
  "polishedImageSlides",
])

export const staticArtifactSafetyValidationResultSchema = z.object({
  status: z.enum(["passed", "failed", "warning"]),
  checkedAt: nonEmptyString.optional(),
  warnings: z.array(nonEmptyString).default([]),
  errors: z.array(nonEmptyString).default([]),
})

export const staticArtifactAssetReferenceSchema = z.object({
  assetId: nonEmptyString,
  slideIndex: nonNegativeInteger.optional(),
  storageKey: nonEmptyString,
  mimeType: nonEmptyString,
  sizeBytes: nonNegativeInteger,
  altText: z.string().optional(),
})

export const staticArtifactErrorCodeSchema = z.enum([
  "static_artifact_permission_denied",
  "static_artifact_invalid_type",
  "static_artifact_invalid_render_mode",
  "static_artifact_not_found",
  "static_artifact_invalid_html",
  "static_artifact_bundle_too_large",
  "static_artifact_storage_failed",
  "static_artifact_provider_unavailable",
  "static_artifact_image_generation_failed",
  "static_artifact_asset_missing",
])

export function validateStaticArtifactMode(
  artifactType: z.infer<typeof staticArtifactTypeSchema>,
  renderMode: z.infer<typeof staticArtifactRenderModeSchema>
):
  | { ok: true }
  | {
      ok: false
      code: z.infer<typeof staticArtifactErrorCodeSchema>
      message: string
    } {
  if (artifactType === "webpage" && renderMode === "polishedImage") {
    return {
      ok: false,
      code: "static_artifact_invalid_render_mode",
      message:
        "polishedImage render mode is only supported for slides artifacts.",
    }
  }

  return { ok: true }
}

function refineStaticArtifactMode(
  input: {
    artifactType: z.infer<typeof staticArtifactTypeSchema>
    renderMode: z.infer<typeof staticArtifactRenderModeSchema>
  },
  ctx: z.RefinementCtx
) {
  const result = validateStaticArtifactMode(input.artifactType, input.renderMode)
  if (!result.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message,
      path: ["renderMode"],
    })
  }
}

function requireBespokeStyleBrief(
  input: {
    theme?: z.infer<typeof staticArtifactThemeSchema>
    bespokeStyleBrief?: string
  },
  ctx: z.RefinementCtx
) {
  if (input.theme === "bespoke" && !input.bespokeStyleBrief?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "bespokeStyleBrief is required when theme is bespoke.",
      path: ["bespokeStyleBrief"],
    })
  }
}

function refineStaticArtifactMetadata(
  input: {
    artifactType: z.infer<typeof staticArtifactTypeSchema>
    renderMode: z.infer<typeof staticArtifactRenderModeSchema>
    generationPath: z.infer<typeof staticArtifactGenerationPathSchema>
    slideCount?: number
    assetReferences: Array<z.infer<typeof staticArtifactAssetReferenceSchema>>
  },
  ctx: z.RefinementCtx
) {
  refineStaticArtifactMode(input, ctx)

  if (input.artifactType === "webpage" && input.renderMode === "html") {
    if (input.generationPath !== "modelHtml") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTML webpages require modelHtml generationPath.",
        path: ["generationPath"],
      })
    }
    return
  }

  if (input.artifactType === "slides" && input.renderMode === "html") {
    if (input.generationPath !== "modelDeckHtml") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTML slides require modelDeckHtml generationPath.",
        path: ["generationPath"],
      })
    }
    if (!input.slideCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTML slides require a positive slideCount.",
        path: ["slideCount"],
      })
    }
    return
  }

  if (input.artifactType === "slides" && input.renderMode === "polishedImage") {
    if (input.generationPath !== "polishedImageSlides") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Polished image slides require polishedImageSlides generationPath.",
        path: ["generationPath"],
      })
    }
    if (!input.slideCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Polished image slides require a positive slideCount.",
        path: ["slideCount"],
      })
    }
    if (input.assetReferences.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Polished image slides require at least one asset reference.",
        path: ["assetReferences"],
      })
    }
  }
}

export const staticArtifactMetadataSchema = z
  .object({
    artifactType: staticArtifactTypeSchema,
    renderMode: staticArtifactRenderModeSchema,
    theme: staticArtifactThemeSchema,
    bespokeStyleBriefSummary: z.string().optional(),
    generationPath: staticArtifactGenerationPathSchema,
    slideCount: positiveInteger.optional(),
    assetReferences: z.array(staticArtifactAssetReferenceSchema).default([]),
    provider: z.string().optional(),
    providerModel: z.string().optional(),
    safetyValidationResult: staticArtifactSafetyValidationResultSchema,
    generationWarnings: z.array(nonEmptyString).default([]),
  })
  .superRefine(refineStaticArtifactMetadata)

export const createStaticArtifactInputSchema = z
  .object({
    title: nonEmptyString,
    description: z.string().optional(),
    artifactType: staticArtifactTypeSchema,
    renderMode: staticArtifactRenderModeSchema,
    contentBrief: nonEmptyString,
    audience: z.string().optional(),
    purpose: z.string().optional(),
    theme: staticArtifactThemeSchema.optional(),
    bespokeStyleBrief: z.string().optional(),
    sourceData: z.string().optional(),
    visibilityScope: artifactVisibilityScopeSchema.optional(),
  })
  .superRefine((input, ctx) => {
    refineStaticArtifactMode(input, ctx)
    requireBespokeStyleBrief(input, ctx)
  })

export const createStaticArtifactOutputSchema = z
  .object({
    artifactId: nonEmptyString,
    title: nonEmptyString,
    artifactType: staticArtifactTypeSchema,
    renderMode: staticArtifactRenderModeSchema,
    version: positiveInteger,
    viewPath: nonEmptyString,
    downloadPath: z.string().optional(),
    theme: nonEmptyString,
    slideCount: positiveInteger.optional(),
    provider: z.string().optional(),
    summary: nonEmptyString,
  })
  .superRefine(refineStaticArtifactMode)

export const editStaticArtifactInputSchema = z
  .object({
    artifactId: nonEmptyString,
    contentBrief: nonEmptyString,
    changeSummary: nonEmptyString,
    theme: staticArtifactThemeSchema.optional(),
    bespokeStyleBrief: z.string().optional(),
  })
  .superRefine(requireBespokeStyleBrief)

export const editStaticArtifactOutputSchema = z
  .object({
    artifactId: nonEmptyString,
    title: nonEmptyString,
    artifactType: staticArtifactTypeSchema,
    renderMode: staticArtifactRenderModeSchema,
    version: positiveInteger,
    previousVersion: positiveInteger,
    viewPath: nonEmptyString,
    summary: nonEmptyString,
  })
  .superRefine(refineStaticArtifactMode)

export const findStaticArtifactsInputSchema = z
  .object({
    query: z.string().optional(),
    artifactType: staticArtifactTypeSchema.optional(),
    renderMode: staticArtifactRenderModeSchema.optional(),
    visibilityScope: artifactVisibilityScopeSchema.optional(),
    limit: positiveInteger.max(50).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.artifactType && input.renderMode) {
      refineStaticArtifactMode(
        {
          artifactType: input.artifactType,
          renderMode: input.renderMode,
        },
        ctx
      )
    }
  })

export const findStaticArtifactsOutputSchema = z.object({
  items: z.array(
    z
      .object({
        artifactId: nonEmptyString,
        title: nonEmptyString,
        artifactType: staticArtifactTypeSchema,
        renderMode: staticArtifactRenderModeSchema,
        version: positiveInteger,
        viewPath: nonEmptyString,
        theme: z.string().optional(),
        updatedAt: nonEmptyString,
      })
      .superRefine(refineStaticArtifactMode)
  ),
  resultCount: nonNegativeInteger,
  truncated: z.boolean(),
})

export type StaticArtifactType = z.infer<typeof staticArtifactTypeSchema>
export type StaticArtifactRenderMode = z.infer<
  typeof staticArtifactRenderModeSchema
>
export type StaticArtifactTheme = z.infer<typeof staticArtifactThemeSchema>
export type StaticArtifactMetadata = z.infer<typeof staticArtifactMetadataSchema>
export type CreateStaticArtifactInput = z.infer<
  typeof createStaticArtifactInputSchema
>
export type CreateStaticArtifactOutput = z.infer<
  typeof createStaticArtifactOutputSchema
>
export type EditStaticArtifactInput = z.infer<typeof editStaticArtifactInputSchema>
export type EditStaticArtifactOutput = z.infer<
  typeof editStaticArtifactOutputSchema
>
export type FindStaticArtifactsInput = z.infer<
  typeof findStaticArtifactsInputSchema
>
export type FindStaticArtifactsOutput = z.infer<
  typeof findStaticArtifactsOutputSchema
>
