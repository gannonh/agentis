import { z } from "zod"
import { artifactVisibilityScopeSchema } from "./artifact-schemas.js"

const nonEmptyString = z.string().trim().min(1)
const positiveInteger = z.number().int().positive()
const nonNegativeInteger = z.number().int().nonnegative()

export const appErrorCodeSchema = z.enum([
  "app_permission_denied",
  "app_not_found",
  "app_invalid_bundle",
  "app_bundle_too_large",
  "app_storage_failed",
  "app_runtime_unavailable",
  "app_state_too_large",
])

export const appBundleValidationResultSchema = z.object({
  status: z.enum(["passed", "failed"]),
  checkedAt: nonEmptyString.optional(),
  warnings: z.array(nonEmptyString).default([]),
  errors: z.array(nonEmptyString).default([]),
})

export const appBundleInputSchema = z.object({
  html: nonEmptyString,
  css: z.string().optional(),
  js: nonEmptyString,
})

export const appMetadataSchema = z.object({
  bundleValidation: appBundleValidationResultSchema,
  stateSchema: z.record(z.unknown()).optional(),
})

export const createAppInputSchema = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  bundle: appBundleInputSchema,
  initialState: z.record(z.unknown()).optional(),
  stateSchema: z.record(z.unknown()).optional(),
  visibilityScope: artifactVisibilityScopeSchema.optional(),
})

export const createAppOutputSchema = z.object({
  artifactId: nonEmptyString,
  title: nonEmptyString,
  version: positiveInteger,
  viewPath: nonEmptyString,
  visibilityScope: artifactVisibilityScopeSchema,
  summary: nonEmptyString,
})

export const editAppInputSchema = z.object({
  artifactId: nonEmptyString,
  bundle: appBundleInputSchema,
  changeSummary: nonEmptyString,
})

export const editAppOutputSchema = z.object({
  artifactId: nonEmptyString,
  title: nonEmptyString,
  version: positiveInteger,
  previousVersion: positiveInteger,
  viewPath: nonEmptyString,
  summary: nonEmptyString,
})

export const findAppsInputSchema = z.object({
  query: z.string().optional(),
  visibilityScope: artifactVisibilityScopeSchema.optional(),
  limit: positiveInteger.max(50).optional(),
})

export const findAppsOutputSchema = z.object({
  items: z.array(
    z.object({
      artifactId: nonEmptyString,
      title: nonEmptyString,
      description: z.string().optional(),
      version: positiveInteger,
      viewPath: nonEmptyString,
      updatedAt: nonEmptyString,
    })
  ),
  resultCount: nonNegativeInteger,
  truncated: z.boolean(),
})

export const appStateResponseSchema = z.object({
  artifactId: nonEmptyString,
  state: z.record(z.unknown()).nullable(),
  updatedAt: nonEmptyString.nullable(),
})

export const updateAppStateRequestSchema = z.object({
  state: z.record(z.unknown()),
})

export const updateAppStateResponseSchema = z.object({
  artifactId: nonEmptyString,
  state: z.record(z.unknown()),
  updatedAt: nonEmptyString,
})

export type AppBundleInput = z.infer<typeof appBundleInputSchema>
export type AppMetadata = z.infer<typeof appMetadataSchema>
export type CreateAppInput = z.infer<typeof createAppInputSchema>
export type CreateAppOutput = z.infer<typeof createAppOutputSchema>
export type EditAppInput = z.infer<typeof editAppInputSchema>
export type EditAppOutput = z.infer<typeof editAppOutputSchema>
export type FindAppsInput = z.infer<typeof findAppsInputSchema>
export type FindAppsOutput = z.infer<typeof findAppsOutputSchema>
export type AppStateResponse = z.infer<typeof appStateResponseSchema>
export type UpdateAppStateRequest = z.infer<typeof updateAppStateRequestSchema>
export type UpdateAppStateResponse = z.infer<typeof updateAppStateResponseSchema>
