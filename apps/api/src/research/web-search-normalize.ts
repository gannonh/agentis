import type { SearchWebInput, SearchWebOutput } from "@workspace/shared"
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

function truncateSnippet(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}…`
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
  raw: RawSearchResult,
  maxSnippetChars: number
): NormalizedSearchResult | null {
  if (typeof raw.title !== "string" || typeof raw.url !== "string") {
    return null
  }

  try {
    new URL(raw.url)
  } catch {
    return null
  }

  const snippet =
    typeof raw.snippet === "string"
      ? truncateSnippet(raw.snippet, maxSnippetChars)
      : undefined
  const source = firstString(raw.source) ?? domainFromUrl(raw.url)

  return {
    title: raw.title.trim(),
    url: raw.url,
    snippet,
    source,
    publishedAt: firstString(raw.publishedAt, raw.date, raw.lastUpdated),
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
  rawResults: RawSearchResult[]
  maxResults: number
  maxSnippetChars: number
  metadata?: Record<string, unknown>
}): SearchWebOutput {
  const results: NormalizedSearchResult[] = []
  for (const raw of input.rawResults) {
    if (results.length >= input.maxResults) break
    const result = normalizeSearchResult(raw, input.maxSnippetChars)
    if (result) results.push(result)
  }

  if (results.length === 0 && input.rawResults.length > 0) {
    throw new Error("No trustworthy search results after normalization")
  }

  return {
    query: input.query,
    provider: input.provider,
    results,
    resultCount: results.length,
    truncated: input.rawResults.length > results.length,
    metadata: input.metadata,
  }
}
