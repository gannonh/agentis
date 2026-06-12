import { Hono } from "hono"
import {
  commandCenterNeedsAttentionResponseSchema,
  commandCenterRecentRunsResponseSchema,
  commandCenterRosterResponseSchema,
  commandCenterSummarySchema,
  type CommandCenterNeedsAttentionItem,
  type LearningSuggestion,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

const NEEDS_ATTENTION_LIMIT = 20
const LOW_SCORE_THRESHOLD = 70

function mergeNeedsAttentionItems(
  buckets: CommandCenterNeedsAttentionItem[][],
  limit: number
): CommandCenterNeedsAttentionItem[] {
  const nonEmptyBuckets = buckets.filter((bucket) => bucket.length > 0)
  if (nonEmptyBuckets.length === 0) {
    return []
  }

  const selectedIds = new Set<string>()
  const merged: CommandCenterNeedsAttentionItem[] = []
  const baseQuota = Math.floor(limit / nonEmptyBuckets.length)
  let remainder = limit % nonEmptyBuckets.length

  for (const bucket of nonEmptyBuckets) {
    const quota = baseQuota + (remainder > 0 ? 1 : 0)
    if (remainder > 0) {
      remainder -= 1
    }

    for (const item of bucket.slice(0, quota)) {
      if (selectedIds.has(item.id)) {
        continue
      }
      selectedIds.add(item.id)
      merged.push(item)
    }
  }

  if (merged.length < limit) {
    const remaining = buckets
      .flat()
      .filter((item) => !selectedIds.has(item.id))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    for (const item of remaining) {
      if (merged.length >= limit) {
        break
      }
      selectedIds.add(item.id)
      merged.push(item)
    }
  }

  return merged.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )
}

function learningSuggestionToAttentionItem(
  suggestion: LearningSuggestion
): CommandCenterNeedsAttentionItem {
  return {
    id: `attention_learning_suggestion_${suggestion.id}`,
    type: "pending_learning_suggestion",
    title: suggestion.title,
    description: suggestion.content,
    tag:
      suggestion.suggestionType === "memory"
        ? "Pending memory"
        : "Pending skill",
    severity: "warning",
    createdAt: suggestion.createdAt,
    href: `/learning?status=pending&suggestionId=${encodeURIComponent(
      suggestion.id
    )}`,
    dismissible: true,
    agentId: suggestion.agentId ?? null,
    threadId: suggestion.sourceThreadId ?? null,
    suggestionId: suggestion.id,
  }
}

export function createCommandCenterRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/summary", (c) => {
    const summary = repos.runs.getCommandCenterSummary(
      repos.agents.list().length
    )
    return c.json(commandCenterSummarySchema.parse(summary))
  })

  app.get("/roster", (c) => {
    const roster = repos.runs.getAgentRosterMetrics()
    return c.json(commandCenterRosterResponseSchema.parse(roster))
  })

  app.get("/needs-attention", (c) => {
    const pendingSuggestionsPage = repos.learningSuggestions.listPaginated({
      page: 1,
      pageSize: NEEDS_ATTENTION_LIMIT,
      status: "pending",
    })
    const failedRuns = repos.runs.listFailedRunsForAttention(
      NEEDS_ATTENTION_LIMIT
    )
    const suggestionItems = pendingSuggestionsPage.suggestions.map(
      learningSuggestionToAttentionItem
    )
    const lowScoreRuns = repos.runs.listLowScoreRunsForAttention(
      LOW_SCORE_THRESHOLD,
      NEEDS_ATTENTION_LIMIT
    )

    const items = mergeNeedsAttentionItems(
      [failedRuns.items, suggestionItems, lowScoreRuns.items],
      NEEDS_ATTENTION_LIMIT
    )
    const totalCount =
      failedRuns.totalCount +
      pendingSuggestionsPage.totalCount +
      lowScoreRuns.totalCount

    return c.json(
      commandCenterNeedsAttentionResponseSchema.parse({ items, totalCount })
    )
  })

  app.get("/recent-runs", (c) => {
    const limitParam = c.req.query("limit")
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 20
    const recentRuns = repos.runs.listRecentRuns(limit)
    return c.json(commandCenterRecentRunsResponseSchema.parse(recentRuns))
  })

  return app
}
