const dismissingSuggestionIds = new Set<string>()

export function acquireNeedsAttentionDismissLock(
  suggestionId: string
): boolean {
  return dismissingSuggestionIds.add(suggestionId)
}

export function releaseNeedsAttentionDismissLock(suggestionId: string) {
  dismissingSuggestionIds.delete(suggestionId)
}

export function resetNeedsAttentionDismissLocksForTests() {
  dismissingSuggestionIds.clear()
}
