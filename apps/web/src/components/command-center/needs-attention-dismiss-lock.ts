const dismissingSuggestionIds = new Set<string>()

export function acquireNeedsAttentionDismissLock(
  suggestionId: string
): boolean {
  if (dismissingSuggestionIds.has(suggestionId)) {
    return false
  }

  dismissingSuggestionIds.add(suggestionId)
  return true
}

export function releaseNeedsAttentionDismissLock(suggestionId: string) {
  dismissingSuggestionIds.delete(suggestionId)
}

export function resetNeedsAttentionDismissLocksForTests() {
  dismissingSuggestionIds.clear()
}
