import { Hono } from "hono"
import type { Repositories } from "../repositories/index.js"

export function createDebugSeedRoutes(repos: Repositories) {
  const app = new Hono()

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
