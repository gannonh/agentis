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
    const pendingSuggestions = repos.learningSuggestions.listPaginated({
      page: 1,
      pageSize: NEEDS_ATTENTION_LIMIT,
      status: "pending",
    }).suggestions

    const items = [
      ...repos.runs.listFailedRunsForAttention(NEEDS_ATTENTION_LIMIT),
      ...pendingSuggestions.map(learningSuggestionToAttentionItem),
      ...repos.runs.listLowScoreRunsForAttention(70, NEEDS_ATTENTION_LIMIT),
    ]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, NEEDS_ATTENTION_LIMIT)

    return c.json(commandCenterNeedsAttentionResponseSchema.parse(items))
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
