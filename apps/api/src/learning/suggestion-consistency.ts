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
  const current = repos.learningSuggestions.getById(suggestion.id) ?? suggestion
  if (current.status !== "pending") {
    return current
  }

  if (!isSuggestionSupersededByMemory(repos, current)) {
    return current
  }

  if (current.sourceThreadId) {
    if (
      repos.learningSuggestions.hasAcceptedSuggestionForThreadContent(
        current.sourceThreadId,
        current.content,
        current.id
      )
    ) {
      return (
        repos.learningSuggestions.updateStatus(current.id, "dismissed") ??
        current
      )
    }

    const otherPending =
      repos.learningSuggestions.listOtherPendingWithSameThreadContent(
        current.sourceThreadId,
        current.content,
        current.id
      )
    const canonical = [current, ...otherPending].reduce((best, candidate) => {
      if (candidate.createdAt !== best.createdAt) {
        return candidate.createdAt < best.createdAt ? candidate : best
      }
      return candidate.id < best.id ? candidate : best
    })
    if (canonical.id !== current.id) {
      return (
        repos.learningSuggestions.updateStatus(current.id, "dismissed") ??
        current
      )
    }
  }

  const healed =
    repos.learningSuggestions.updateStatus(current.id, "accepted") ?? current

  if (current.status === "pending" && healed.status === "accepted") {
    dismissDuplicatePendingSuggestions(repos, healed)
  }

  return healed
}

export function filterVisiblePendingSuggestions(
  repos: Repositories,
  suggestions: LearningSuggestion[]
): LearningSuggestion[] {
  return suggestions.filter(
    (suggestion) =>
      suggestion.status === "pending" &&
      !isSuggestionSupersededByMemory(repos, suggestion)
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

    let healedOnPage = 0
    for (const suggestion of batch.suggestions) {
      const before = repos.learningSuggestions.getById(suggestion.id)
      const healed = healStalePendingSuggestion(repos, suggestion)
      if (before?.status === "pending" && healed.status !== "pending") {
        healedCount += 1
        healedOnPage += 1
      }
    }

    if (healedOnPage > 0) {
      continue
    }

    if (page >= batch.totalPages) {
      break
    }
    page += 1
  }

  return healedCount
}
