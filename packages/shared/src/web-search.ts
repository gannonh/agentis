import { z } from "zod"

const nonEmptyString = z.string().min(1)

export const NATIVE_TOOL_PERMISSION_IDS = ["webSearch"] as const

export type NativeToolPermissionId = (typeof NATIVE_TOOL_PERMISSION_IDS)[number]

export const nativeToolPermissionIdSchema = z.enum(NATIVE_TOOL_PERMISSION_IDS)

export const nativeToolsSchema = z.array(nativeToolPermissionIdSchema)

export const DEFAULT_CUSTOM_AGENT_NATIVE_TOOLS: NativeToolPermissionId[] = [
  "webSearch",
]

export const searchWebRecencySchema = z.enum(["day", "week", "month", "year"])

export const searchWebInputSchema = z.object({
  query: nonEmptyString.max(500),
  maxResults: z.number().int().positive().max(10).optional(),
  domains: z.array(nonEmptyString.max(253)).max(20).optional(),
  recency: searchWebRecencySchema.optional(),
})

export const searchWebResultSchema = z.object({
  title: nonEmptyString,
  url: nonEmptyString.url(),
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
