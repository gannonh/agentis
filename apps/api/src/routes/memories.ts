import { Hono } from "hono"
import {
  createSavedMemoryRequestSchema,
  memoriesListResponseSchema,
  savedMemoryCategoryKeySchema,
  savedMemorySchema,
} from "@workspace/shared"
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

  app.post("/", async (c) => {
    const input = createSavedMemoryRequestSchema.parse(await c.req.json())
    const memory = repos.savedMemories.create(input)

    return c.json(savedMemorySchema.parse(memory), 201)
  })

  return app
}
