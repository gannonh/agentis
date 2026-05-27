import { Hono } from "hono"
import { memoriesListResponseSchema, savedMemoryCategoryKeySchema } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function createMemoryRoutes(repos: Repositories): Hono {
  const app = new Hono()

  app.get("/", (c) => {
    const category = c.req.query("category")
    const memories = repos.savedMemories.list(
      category ? savedMemoryCategoryKeySchema.parse(category) : undefined
    )

    return c.json(memoriesListResponseSchema.parse(memories))
  })

  return app
}
