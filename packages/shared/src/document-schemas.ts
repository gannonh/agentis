import { z } from "zod"
import {
  artifactSourceSchema,
  artifactVisibilityScopeSchema,
  markdownDocumentPublicSchema,
  markdownDocumentSchema,
} from "./artifact-schemas.js"

const nonEmptyString = z.string().min(1)
const positiveInteger = z.number().int().positive()

export const documentTypeSchema = z.literal("document")

export const legacyDocumentTypeSchema = z.enum([
  "markdown",
  "webpage",
  "image",
  "video",
  "table",
  "slides",
  "other",
])

export const documentVisibilityScopeSchema = artifactVisibilityScopeSchema

export const documentSourceSchema = artifactSourceSchema

export const documentContentFormatSchema = z.literal("markdown")

export const documentSchema = markdownDocumentSchema

export const documentVersionSchema = z.object({
  id: nonEmptyString,
  documentId: nonEmptyString,
  version: positiveInteger,
  contentHash: nonEmptyString,
  contentStorageKey: nonEmptyString,
  changeSummary: z.string().nullable().optional(),
  createdByRunId: z.string().nullable().optional(),
  createdByThreadId: z.string().nullable().optional(),
  createdAt: nonEmptyString,
})

/** API responses omit internal storage paths. */
export const documentPublicSchema = markdownDocumentPublicSchema

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
  selectedVersion: positiveInteger.nullable().optional(),
  currentVersion: positiveInteger.nullable().optional(),
  versions: z.array(documentVersionSummarySchema),
})

export const updateDocumentContentRequestSchema = z.object({
  content: nonEmptyString,
  baseVersion: positiveInteger,
  changeSummary: z.string().optional(),
})

export const updateDocumentContentResponseSchema = z.object({
  document: documentPublicSchema,
  currentVersion: positiveInteger,
})

export const updateDocumentVisibilityRequestSchema = z
  .object({
    visibilityScope: documentVisibilityScopeSchema,
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
