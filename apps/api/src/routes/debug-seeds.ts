import { Hono } from "hono"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"

function hasDebugSeedAccess(request: Request, debugSeedKey: string): boolean {
  const authorization = request.headers.get("authorization")
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined
  return (
    bearer === debugSeedKey ||
    request.headers.get("x-agentis-debug-key") === debugSeedKey
  )
}

export function createDebugSeedRoutes(
  repos: Repositories,
  config: AppConfig
): Hono {
  const app = new Hono()

  app.use("*", async (c, next) => {
    const debugSeedKey = config.debugSeedKey?.trim()
    if (!debugSeedKey || !hasDebugSeedAccess(c.req.raw, debugSeedKey)) {
      return c.json(
        { error: "Debug seed access denied", code: "debug_seed_forbidden" },
        403
      )
    }
    await next()
  })

  app.get("/datasets", (c) => {
    return c.json({ datasets: repos.testingSeeds.listDatasets() })
  })

  app.post("/datasets/:datasetId", (c) => {
    repos.integrationToolkits.seedFeatured()
    const result = repos.testingSeeds.seed(c.req.param("datasetId"))
    if (!result) {
      return c.json(
        {
          error: "Debug dataset not found",
          code: "debug_dataset_not_found",
        },
        404
      )
    }
    return c.json(result)
  })

  app.delete("/datasets/:datasetId", (c) => {
    const result = repos.testingSeeds.delete(c.req.param("datasetId"))
    if (!result) {
      return c.json(
        {
          error: "Debug dataset not found",
          code: "debug_dataset_not_found",
        },
        404
      )
    }
    return c.json(result)
  })

  return app
}
