import { z } from "zod"

const nonEmptyString = z.string().min(1)
const nonNegativeInteger = z.number().int().nonnegative()

export const documentTypeSchema = z.enum([
  "markdown",
  "webpage",
  "image",
  "video",
  "table",
  "slides",
  "other",
])

export const documentVisibilityScopeSchema = z.enum([
  "thread",
  "project",
  "global",
])

export const documentSourceSchema = z.enum(["user", "agent"])

export const documentContentFormatSchema = z.enum([
  "markdown",
  "text",
  "binary",
])

const documentBaseSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  description: z.string().nullable().optional(),
  documentType: documentTypeSchema,
  contentFormat: documentContentFormatSchema,
  mimeType: nonEmptyString,
  sizeBytes: nonNegativeInteger,
  storageKey: nonEmptyString,
  previewText: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  visibilityScope: documentVisibilityScopeSchema,
  projectId: z.string().nullable().optional(),
  projectNameSnapshot: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  threadTitleSnapshot: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  agentNameSnapshot: z.string().nullable().optional(),
  currentVersionId: z.string().nullable().optional(),
  currentVersion: z.number().int().positive().nullable().optional(),
  createdAt: nonEmptyString,
  updatedAt: nonEmptyString,
})

function validateDocumentScope(
  document: {
    visibilityScope: z.infer<typeof documentVisibilityScopeSchema>
    threadId?: string | null
    projectId?: string | null
  },
  ctx: z.RefinementCtx
) {
  if (document.visibilityScope === "thread" && !document.threadId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["threadId"],
      message: "Thread-scoped documents require threadId",
    })
  }
  if (document.visibilityScope === "project" && !document.projectId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["projectId"],
      message: "Project-scoped documents require projectId",
    })
  }
}

export const documentSchema = documentBaseSchema.superRefine(
  validateDocumentScope
)

export const documentVersionSchema = z.object({
  id: nonEmptyString,
  documentId: nonEmptyString,
  version: z.number().int().positive(),
  contentHash: nonEmptyString,
  contentStorageKey: nonEmptyString,
  changeSummary: z.string().nullable().optional(),
  createdByRunId: z.string().nullable().optional(),
  createdByThreadId: z.string().nullable().optional(),
  createdAt: nonEmptyString,
})

/** API responses omit internal storage paths. */
export const documentPublicSchema = documentBaseSchema
  .omit({ storageKey: true })
  .superRefine(validateDocumentScope)

export const documentVersionSummarySchema = documentVersionSchema.pick({
  id: true,
  version: true,
  changeSummary: true,
  createdAt: true,
})

export const documentDetailResponseSchema = z.object({
  document: documentPublicSchema,
  content: z.string().nullable(),
  truncated: z.boolean().optional(),
  selectedVersion: z.number().int().positive().nullable().optional(),
  currentVersion: z.number().int().positive().nullable().optional(),
  versions: z.array(documentVersionSummarySchema),
})

export const updateDocumentContentRequestSchema = z.object({
  content: nonEmptyString,
  baseVersion: z.number().int().positive(),
  changeSummary: z.string().optional(),
})

export const updateDocumentContentResponseSchema = z.object({
  document: documentPublicSchema,
  currentVersion: z.number().int().positive(),
})

export const updateDocumentVisibilityRequestSchema = z.object({
  visibilityScope: documentVisibilityScopeSchema,
  projectId: z.string().optional(),
})

export const updateDocumentVisibilityResponseSchema = z.object({
  document: documentPublicSchema,
  previousVisibilityScope: documentVisibilityScopeSchema,
})

export const listDocumentsQuerySchema = z.object({
  query: z.string().optional(),
  documentType: documentTypeSchema.optional(),
  visibilityScope: documentVisibilityScopeSchema.optional(),
  projectId: z.string().optional(),
  threadId: z.string().optional(),
  source: documentSourceSchema.optional(),
  agentId: z.string().optional(),
})
