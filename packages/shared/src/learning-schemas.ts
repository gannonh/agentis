import { z } from "zod"
import {
  memoriesListResponseSchema,
  savedMemoryCategoryKeySchema,
  savedMemorySchema,
} from "./schemas.js"

export const learningSummarySchema = z.object({
  skillsCount: z.number().int().nonnegative(),
  memoriesCount: z.number().int().nonnegative(),
  rubricsCount: z.number().int().nonnegative(),
  pendingSuggestionsCount: z.number().int().nonnegative(),
})

export const learningSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  pinned: z.boolean(),
  agentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const learningRubricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  agentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const learningPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const learningPaginatedMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export const learningSkillsListResponseSchema = learningPaginatedMetaSchema.extend({
  skills: z.array(learningSkillSchema),
})

export const learningRubricsListResponseSchema =
  learningPaginatedMetaSchema.extend({
    rubrics: z.array(learningRubricSchema),
  })

export const learningMemoriesListResponseSchema =
  learningPaginatedMetaSchema.extend({
    categories: memoriesListResponseSchema.shape.categories,
    memories: z.array(savedMemorySchema),
  })

export const createLearningSkillRequestSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  pinned: z.boolean().optional(),
  agentId: z.string().optional(),
})

export const learningMemoriesQuerySchema = learningPaginationQuerySchema.extend({
  category: savedMemoryCategoryKeySchema.optional(),
})

export type LearningSummary = z.infer<typeof learningSummarySchema>
export type LearningSkill = z.infer<typeof learningSkillSchema>
export type LearningRubric = z.infer<typeof learningRubricSchema>
export type LearningSkillsListResponse = z.infer<
  typeof learningSkillsListResponseSchema
>
export type LearningRubricsListResponse = z.infer<
  typeof learningRubricsListResponseSchema
>
export type LearningMemoriesListResponse = z.infer<
  typeof learningMemoriesListResponseSchema
>
export type CreateLearningSkillRequest = z.infer<
  typeof createLearningSkillRequestSchema
>
