import {
  searchWebOutputSchema,
  type SearchWebInput,
  type SearchWebOutput,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"

type RawSearchResult = {
  title?: unknown
  url?: unknown
  snippet?: unknown
  source?: unknown
  publishedAt?: unknown
  date?: unknown
  lastUpdated?: unknown
}

type NormalizedSearchResult = SearchWebOutput["results"][number]

function truncateString(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}…`
}

function trimOptionalString(value: unknown, maxChars: number): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return truncateString(trimmed, maxChars)
}

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string")
}

function normalizeSearchResult(
  raw: unknown,
  maxSnippetChars: number
): NormalizedSearchResult | null {
  if (typeof raw !== "object" || raw === null) return null
  const record = raw as RawSearchResult
  if (typeof record.title !== "string" || typeof record.url !== "string") {
    return null
  }

  const title = record.title.trim()
  if (!title) return null

  let url: URL
  try {
    url = new URL(record.url)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null

  const snippet = trimOptionalString(record.snippet, maxSnippetChars)
  const source =
    trimOptionalString(record.source, 200) ?? domainFromUrl(record.url)

  return {
    title,
    url: record.url,
    snippet,
    source,
    publishedAt: trimOptionalString(
      firstString(record.publishedAt, record.date, record.lastUpdated),
      100
    ),
  }
}

export function boundSearchInput(
  input: SearchWebInput,
  config: AppConfig
): SearchWebInput {
  const maxResults = Math.min(
    input.maxResults ?? config.webSearchMaxResults,
    10,
    config.webSearchMaxResults
  )
  return {
    ...input,
    query: input.query.trim(),
    maxResults: Math.max(1, maxResults),
    domains: input.domains?.slice(0, 20),
  }
}

export function normalizeSearchResults(input: {
  query: string
  provider: string
  rawResults: unknown[]
  maxResults: number
  maxSnippetChars: number
  metadata?: Record<string, unknown>
}): SearchWebOutput {
  if (!Array.isArray(input.rawResults)) {
    throw new Error("Gateway search output did not include a results array")
  }

  const results: NormalizedSearchResult[] = []
  for (const raw of input.rawResults) {
    if (results.length >= input.maxResults) break
    const result = normalizeSearchResult(raw, input.maxSnippetChars)
    if (result) results.push(result)
  }

  if (results.length === 0 && input.rawResults.length > 0) {
    throw new Error("No trustworthy search results after normalization")
  }

  return searchWebOutputSchema.parse({
    query: input.query,
    provider: input.provider,
    results,
    resultCount: results.length,
    truncated: input.rawResults.length > results.length,
    metadata: input.metadata,
  })
}
