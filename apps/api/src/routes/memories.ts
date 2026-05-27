import { Hono } from "hono"
import { memoriesListResponseSchema, savedMemoryCategoryNameSchema } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function createMemoryRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/", (c) => {
    const category = c.req.query("category")
    if (category) {
      const parsedCategory = savedMemoryCategoryNameSchema.parse(category)
      return c.json(
        memoriesListResponseSchema.parse(
          repos.savedMemories.listByCategory(parsedCategory)
        )
      )
    }
    return c.json(memoriesListResponseSchema.parse(repos.savedMemories.list()))
  })

  return app
}
