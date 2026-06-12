import type { LearningSuggestion } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function isSuggestionSupersededByMemory(
  repos: Repositories,
  suggestion: LearningSuggestion
): boolean {
  if (suggestion.status !== "pending" || !suggestion.sourceThreadId) {
    return false
  }

  return repos.savedMemories.existsThreadDerivedMemory(
    suggestion.sourceThreadId,
    suggestion.content
  )
}

export function healStalePendingSuggestion(
  repos: Repositories,
  suggestion: LearningSuggestion
): LearningSuggestion {
  if (!isSuggestionSupersededByMemory(repos, suggestion)) {
    return suggestion
  }

  return (
    repos.learningSuggestions.updateStatus(suggestion.id, "accepted") ??
    suggestion
  )
}

export function healStalePendingSuggestions(
  repos: Repositories,
  suggestions: LearningSuggestion[]
): LearningSuggestion[] {
  return suggestions.map((suggestion) =>
    healStalePendingSuggestion(repos, suggestion)
  )
}

export function dismissDuplicatePendingSuggestions(
  repos: Repositories,
  suggestion: LearningSuggestion
): void {
  if (!suggestion.sourceThreadId) return

  const duplicates = repos.learningSuggestions.listOtherPendingWithSameThreadContent(
    suggestion.sourceThreadId,
    suggestion.content,
    suggestion.id
  )

  for (const duplicate of duplicates) {
    repos.learningSuggestions.updateStatus(duplicate.id, "dismissed")
  }
}

export function syncPendingLearningSuggestions(repos: Repositories): number {
  let healedCount = 0
  let page = 1

  while (true) {
    const batch = repos.learningSuggestions.listPaginated({
      page,
      pageSize: 100,
      status: "pending",
    })
    if (batch.suggestions.length === 0) {
      break
    }

    for (const suggestion of batch.suggestions) {
      const healed = healStalePendingSuggestion(repos, suggestion)
      if (healed.status !== suggestion.status) {
        healedCount += 1
      }
    }

    if (page >= batch.totalPages) {
      break
    }
    page += 1
  }

  return healedCount
}
