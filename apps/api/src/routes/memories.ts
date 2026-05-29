import { Hono } from "hono"
import {
  createSavedMemoryRequestSchema,
  memoriesListResponseSchema,
  savedMemoryCategoryKeySchema,
  savedMemorySchema,
  updateSavedMemoryRequestSchema,
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

  function getScopedAgentIds(input: {
    scope?: "global" | "agent"
    associatedAgent?: string | null
    associatedAgents?: string[]
    fallbackAssociatedAgents?: string[]
  }): string[] {
    if (input.scope !== "agent") return []
    if (input.associatedAgents?.length) return input.associatedAgents
    if (input.associatedAgent) return [input.associatedAgent]
    return input.fallbackAssociatedAgents ?? []
  }

  function validateAgentScope(input: {
    scope?: "global" | "agent"
    associatedAgent?: string | null
    associatedAgents?: string[]
  }): { error: string; code: string } | null {
    if (input.scope !== "agent") return null

    const agentIds = getScopedAgentIds(input)
    if (agentIds.length === 0) {
      return { error: "Agent is required", code: "agent_required" }
    }
    const missingAgent = agentIds.find(
      (agentId) => !repos.agents.getById(agentId)
    )
    if (missingAgent) {
      return { error: "Agent not found", code: "agent_not_found" }
    }
    return null
  }

  app.post("/", async (c) => {
    const input = createSavedMemoryRequestSchema.parse(await c.req.json())
    const scopeError = validateAgentScope(input)
    if (scopeError) return c.json(scopeError, 400)
    const memory = repos.savedMemories.create({
      ...input,
      associatedAgent:
        input.scope === "agent" ? input.associatedAgent : undefined,
      associatedAgents: input.scope === "agent" ? input.associatedAgents : [],
    })

    return c.json(savedMemorySchema.parse(memory), 201)
  })

  app.patch("/:id", async (c) => {
    const existing = repos.savedMemories.getById(c.req.param("id"))
    if (!existing) {
      return c.json(
        { error: "Memory not found", code: "memory_not_found" },
        404
      )
    }

    const input = updateSavedMemoryRequestSchema.parse(await c.req.json())
    const nextScope = input.scope ?? existing.scope
    const nextAssociatedAgents = getScopedAgentIds({
      scope: nextScope,
      associatedAgent: input.associatedAgent,
      associatedAgents: input.associatedAgents,
      fallbackAssociatedAgents: existing.associatedAgents,
    })
    const nextAssociatedAgent = nextAssociatedAgents[0]
    const scopeError = validateAgentScope({
      scope: nextScope,
      associatedAgent: nextAssociatedAgent,
      associatedAgents: nextAssociatedAgents,
    })
    if (scopeError) return c.json(scopeError, 400)

    const memory = repos.savedMemories.update(existing.id, {
      ...input,
      scope: nextScope,
      associatedAgent: nextAssociatedAgent,
      associatedAgents: nextAssociatedAgents,
    })
    if (!memory) {
      return c.json(
        { error: "Memory not found", code: "memory_not_found" },
        404
      )
    }

    return c.json(savedMemorySchema.parse(memory))
  })

  return app
}
