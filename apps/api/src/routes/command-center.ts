import { Hono } from "hono"
import { commandCenterSummarySchema } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function createCommandCenterRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/summary", (c) => {
    const summary = repos.runs.getCommandCenterSummary(repos.agents.list().length)
    return c.json(commandCenterSummarySchema.parse(summary))
  })

  return app
}
