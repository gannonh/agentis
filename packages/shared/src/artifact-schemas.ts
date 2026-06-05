import { z } from "zod"

const nonEmptyString = z.string().min(1)
const nonNegativeInteger = z.number().int().nonnegative()
const positiveInteger = z.number().int().positive()

export const artifactTypeSchema = z.enum([
  "document",
  "webpage",
  "slides",
  "hyperapp",
  "table",
  "image",
  "video",
  "other",
])

export const artifactVisibilityScopeSchema = z.enum([
  "thread",
  "project",
  "global",
])

export const artifactSourceSchema = z.enum(["user", "agent"])

export const artifactContentFormatSchema = z.enum([
  "markdown",
  "html",
  "json",
  "binary",
  "manifest",
  "text",
])

const artifactBaseSchema = z.object({
  id: nonEmptyString,
  type: artifactTypeSchema,
  title: nonEmptyString,
  description: z.string().nullable().optional(),
  contentFormat: artifactContentFormatSchema,
  mimeType: nonEmptyString,
  sizeBytes: nonNegativeInteger,
  storageKey: nonEmptyString,
  previewText: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  visibilityScope: artifactVisibilityScopeSchema,
  projectId: z.string().nullable().optional(),
  projectNameSnapshot: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  threadTitleSnapshot: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  agentNameSnapshot: z.string().nullable().optional(),
  currentVersionId: z.string().nullable().optional(),
  currentVersion: positiveInteger.nullable().optional(),
  createdAt: nonEmptyString,
  updatedAt: nonEmptyString,
})

function validateArtifactScope(
  artifact: {
    visibilityScope: z.infer<typeof artifactVisibilityScopeSchema>
    threadId?: string | null
    projectId?: string | null
  },
  ctx: z.RefinementCtx
) {
  if (artifact.visibilityScope === "thread" && !artifact.threadId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["threadId"],
      message: "Thread-scoped artifacts require threadId",
    })
  }
  if (artifact.visibilityScope === "project" && !artifact.projectId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["projectId"],
      message: "Project-scoped artifacts require projectId",
    })
  }
}

export const artifactSchema = artifactBaseSchema.superRefine(
  validateArtifactScope
)

/** API responses omit internal storage paths. */
export const artifactPublicSchema = artifactBaseSchema
  .omit({ storageKey: true })
  .superRefine(validateArtifactScope)

export const artifactVersionSchema = z.object({
  id: nonEmptyString,
  artifactId: nonEmptyString,
  version: positiveInteger,
  contentHash: nonEmptyString,
  contentStorageKey: nonEmptyString,
  changeSummary: z.string().nullable().optional(),
  createdByRunId: z.string().nullable().optional(),
  createdByThreadId: z.string().nullable().optional(),
  createdAt: nonEmptyString,
})

export const artifactVersionSummarySchema = artifactVersionSchema.pick({
  id: true,
  version: true,
  changeSummary: true,
  createdAt: true,
})

export const artifactDetailResponseSchema = z.object({
  artifact: artifactPublicSchema,
  content: z.string().nullable(),
  truncated: z.boolean().optional(),
  selectedVersion: positiveInteger.nullable().optional(),
  currentVersion: positiveInteger.nullable().optional(),
  versions: z.array(artifactVersionSummarySchema),
})

export const updateArtifactContentRequestSchema = z.object({
  content: nonEmptyString,
  baseVersion: positiveInteger,
  changeSummary: z.string().optional(),
})

export const updateArtifactContentResponseSchema = z.object({
  artifact: artifactPublicSchema,
  currentVersion: positiveInteger,
})

export const updateArtifactVisibilityRequestSchema = z
  .object({
    visibilityScope: artifactVisibilityScopeSchema,
    projectId: z.string().optional(),
    threadId: z.string().optional(),
  })
  .refine(
    (input) =>
      input.visibilityScope !== "thread" || Boolean(input.threadId?.trim()),
    {
      message: "Thread is required for thread visibility",
      path: ["threadId"],
    }
  )

export const updateArtifactVisibilityResponseSchema = z.object({
  artifact: artifactPublicSchema,
  previousVisibilityScope: artifactVisibilityScopeSchema,
})

export const listArtifactsQuerySchema = z.object({
  query: z.string().optional(),
  type: artifactTypeSchema.optional(),
  visibilityScope: artifactVisibilityScopeSchema.optional(),
  projectId: z.string().optional(),
  threadId: z.string().optional(),
  source: artifactSourceSchema.optional(),
  agentId: z.string().optional(),
})

export const markdownDocumentSchema = artifactBaseSchema
  .extend({
    type: z.literal("document"),
    contentFormat: z.literal("markdown"),
  })
  .superRefine(validateArtifactScope)

export const markdownDocumentPublicSchema = artifactBaseSchema
  .omit({ storageKey: true })
  .extend({
    type: z.literal("document"),
    contentFormat: z.literal("markdown"),
  })
  .superRefine(validateArtifactScope)
