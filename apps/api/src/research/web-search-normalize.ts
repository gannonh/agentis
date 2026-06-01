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
  const results = []
  for (const raw of input.rawResults) {
    if (results.length >= input.maxResults) break
    if (typeof raw.title !== "string" || typeof raw.url !== "string") continue
    try {
      new URL(raw.url)
    } catch {
      continue
    }

    const snippet =
      typeof raw.snippet === "string"
        ? truncateSnippet(raw.snippet, input.maxSnippetChars)
        : undefined
    const publishedAt =
      typeof raw.publishedAt === "string"
        ? raw.publishedAt
        : typeof raw.date === "string"
          ? raw.date
          : typeof raw.lastUpdated === "string"
            ? raw.lastUpdated
            : undefined

    results.push({
      title: raw.title.trim(),
      url: raw.url,
      snippet,
      source:
        typeof raw.source === "string"
          ? raw.source
          : domainFromUrl(raw.url),
      publishedAt,
    })
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
