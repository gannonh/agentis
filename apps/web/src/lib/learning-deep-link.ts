export function learningSuggestionDomId(suggestionId: string): string {
  return `learning-suggestion-${suggestionId}`
}

export function parseLearningDeepLink(searchParams: URLSearchParams): {
  suggestionId: string | null
  status: string | null
} {
  const suggestionId = searchParams.get("suggestionId")?.trim() || null
  const status = searchParams.get("status")?.trim() || null
  return { suggestionId, status }
}
