import { z } from "zod"

const nonEmptyString = z.string().min(1)
const trimmedNonEmptyString = z.string().trim().min(1)
const httpUrl = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "URL must use http or https"
  )

export const searchWebRecencySchema = z.enum(["day", "week", "month", "year"])

export const searchWebInputSchema = z.object({
  query: trimmedNonEmptyString.max(500),
  maxResults: z.number().int().positive().max(10).optional(),
  domains: z.array(trimmedNonEmptyString.max(253)).max(20).optional(),
  recency: searchWebRecencySchema.optional(),
})

export const searchWebResultSchema = z.object({
  title: trimmedNonEmptyString,
  url: httpUrl,
  snippet: z.string().max(1000).optional(),
  source: z.string().max(200).optional(),
  publishedAt: z.string().max(100).optional(),
})

export const searchWebOutputSchema = z.object({
  query: nonEmptyString,
  provider: nonEmptyString,
  results: z.array(searchWebResultSchema),
  resultCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
})

export type SearchWebInput = z.infer<typeof searchWebInputSchema>
export type SearchWebOutput = z.infer<typeof searchWebOutputSchema>
export type SearchWebRecency = z.infer<typeof searchWebRecencySchema>
