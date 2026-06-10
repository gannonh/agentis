import { Hono } from "hono"
import {
  commandCenterRecentRunsResponseSchema,
  commandCenterRosterResponseSchema,
  commandCenterSummarySchema,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function createCommandCenterRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/summary", (c) => {
    const summary = repos.runs.getCommandCenterSummary(repos.agents.list().length)
    return c.json(commandCenterSummarySchema.parse(summary))
  })

  app.get("/roster", (c) => {
    const roster = repos.runs.getAgentRosterMetrics()
    return c.json(commandCenterRosterResponseSchema.parse(roster))
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
