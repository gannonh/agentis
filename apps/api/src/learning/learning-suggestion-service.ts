import type {
  AcceptLearningSuggestionRequest,
  AcceptLearningSuggestionResponse,
  LearningSuggestion,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"
import { dismissDuplicatePendingSuggestions } from "./suggestion-consistency.js"

function suggestionNotPending(suggestion: LearningSuggestion) {
  return suggestion.status !== "pending"
}

export function acceptLearningSuggestion(
  repos: Repositories,
  suggestionId: string,
  input: AcceptLearningSuggestionRequest = {}
): AcceptLearningSuggestionResponse | null {
  const suggestion = repos.learningSuggestions.getById(suggestionId)
  if (!suggestion || suggestionNotPending(suggestion)) return null

  if (suggestion.suggestionType === "skill") {
    const updated = repos.learningSuggestions.updateStatus(suggestionId, "accepted")
    if (!updated) return null
    const skill = repos.skills.create({
      name: suggestion.title,
      description: input.content?.trim() || suggestion.content,
      pinned: input.pinnedToContext ?? false,
      agentId: suggestion.agentId ?? undefined,
    })
    return { suggestion: updated, skillId: skill.id }
  }

  const content = input.content?.trim() || suggestion.content
  const scope =
    input.scope ?? (suggestion.agentId ? ("agent" as const) : ("global" as const))
  const existingMemory = suggestion.sourceThreadId
    ? repos.savedMemories.findThreadDerivedMemory(
        suggestion.sourceThreadId,
        suggestion.content
      )
    : null

  const updated = repos.learningSuggestions.updateStatus(suggestionId, "accepted")
  if (!updated) return null

  const memory =
    existingMemory ??
    repos.savedMemories.createFromThread({
      content,
      category: input.category ?? "memory_category_preference",
      importance: input.importance ?? "medium",
      usageGuidance:
        input.usageGuidance ??
        "Use when working on follow-up tasks from the source thread.",
      tags: [],
      scope,
      associatedAgent: scope === "agent" ? suggestion.agentId ?? undefined : undefined,
      sourceThreadId: suggestion.sourceThreadId ?? "",
      sourceThreadTitle: suggestion.sourceThreadTitle ?? "Unknown thread",
      pinnedToContext: input.pinnedToContext ?? true,
    })

  dismissDuplicatePendingSuggestions(repos, updated)

  return { suggestion: updated, savedMemoryId: memory.id }
}

export function dismissLearningSuggestion(
  repos: Repositories,
  suggestionId: string
): LearningSuggestion | null {
  const suggestion = repos.learningSuggestions.getById(suggestionId)
  if (!suggestion || suggestionNotPending(suggestion)) return null
  return repos.learningSuggestions.updateStatus(suggestionId, "dismissed")
}
