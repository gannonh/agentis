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
    if (input.scope === "agent") {
      if (!input.associatedAgent) {
        return c.json(
          { error: "Agent is required", code: "agent_required" },
          400
        )
      }
      if (!repos.agents.getById(input.associatedAgent)) {
        return c.json(
          { error: "Agent not found", code: "agent_not_found" },
          400
        )
      }
    }
    const memory = repos.savedMemories.create({
      ...input,
      associatedAgent: input.scope === "agent" ? input.associatedAgent : undefined,
    })

    return c.json(savedMemorySchema.parse(memory), 201)
  })

  return app
}
