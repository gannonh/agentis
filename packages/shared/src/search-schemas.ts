import { z } from "zod"
import { artifactTypeSchema } from "./artifact-schemas.js"

export const MAX_SEARCH_QUERY_LENGTH = 200

export const searchEntityTypeSchema = z.enum([
  "thread",
  "artifact",
  "agent",
  "project",
])

export const searchHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  entityType: searchEntityTypeSchema,
  artifactType: artifactTypeSchema.optional(),
})

export const searchResponseSchema = z.object({
  query: z.string(),
  threads: z.array(searchHitSchema),
  artifacts: z.array(searchHitSchema),
  agents: z.array(searchHitSchema),
  projects: z.array(searchHitSchema),
})

export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>
export type SearchHit = z.infer<typeof searchHitSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
