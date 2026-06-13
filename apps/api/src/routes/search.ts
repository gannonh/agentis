import { Hono } from "hono"
import { searchResponseSchema } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"
import { SearchService } from "../search/search-service.js"

export function createSearchRoutes(repos: Repositories) {
  const app = new Hono()
  const searchService = new SearchService(repos)

  app.get("/", (c) => {
    const query = c.req.query("q") ?? ""
    const response = searchService.search(query)
    return c.json(searchResponseSchema.parse(response))
  })

  return app
}
