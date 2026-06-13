import { Hono } from "hono"
import {
  emptySearchResponse,
  normalizeSearchQuery,
  searchResponseSchema,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"
import { SearchService } from "../search/search-service.js"

export function createSearchRoutes(repos: Repositories) {
  const app = new Hono()
  const searchService = new SearchService(repos)

  app.get("/", (c) => {
    const normalized = normalizeSearchQuery(c.req.query("q") ?? "")
    if (normalized.status === "too_long") {
      return c.json({ error: "Search query is too long." }, 400)
    }
    if (normalized.status === "empty") {
      return c.json(searchResponseSchema.parse(emptySearchResponse()))
    }
    const response = searchService.search(normalized.query)
    return c.json(searchResponseSchema.parse(response))
  })

  return app
}
