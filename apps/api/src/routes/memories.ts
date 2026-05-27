import { Hono } from "hono"
import { memoriesListResponseSchema, savedMemoryCategoryNameSchema } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function createMemoryRoutes(repos: Repositories): Hono {
  const app = new Hono()

  app.get("/", (c) => {
    const category = c.req.query("category")
    const memories = category
      ? repos.savedMemories.listByCategory(
          savedMemoryCategoryNameSchema.parse(category)
        )
      : repos.savedMemories.list()

    return c.json(memoriesListResponseSchema.parse(memories))
  })

  return app
}
