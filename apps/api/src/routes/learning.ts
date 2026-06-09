import { Hono } from "hono"
import {
  createLearningSkillRequestSchema,
  learningMemoriesListResponseSchema,
  learningMemoriesQuerySchema,
  learningPaginationQuerySchema,
  learningRubricsListResponseSchema,
  learningSkillSchema,
  learningSkillsListResponseSchema,
  learningSummarySchema,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export function createLearningRoutes(repos: Repositories): Hono {
  const app = new Hono()

  app.get("/summary", (c) => {
    const summary = {
      skillsCount: repos.skills.count(),
      memoriesCount: repos.savedMemories.count(),
      rubricsCount: repos.rubrics.count(),
      pendingSuggestionsCount: repos.learningSuggestions.countPending(),
    }
    return c.json(learningSummarySchema.parse(summary))
  })

  app.get("/skills", (c) => {
    const query = learningPaginationQuerySchema.parse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
    })
    const response = repos.skills.listPaginated(query)
    return c.json(learningSkillsListResponseSchema.parse(response))
  })

  app.post("/skills", async (c) => {
    const input = createLearningSkillRequestSchema.parse(await c.req.json())
    if (input.agentId && !repos.agents.getById(input.agentId)) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }
    const skill = repos.skills.create(input)
    return c.json(learningSkillSchema.parse(skill), 201)
  })

  app.get("/memories", (c) => {
    const query = learningMemoriesQuerySchema.parse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
      category: c.req.query("category"),
    })
    const response = repos.savedMemories.listPaginated(query)
    return c.json(learningMemoriesListResponseSchema.parse(response))
  })

  app.get("/rubrics", (c) => {
    const query = learningPaginationQuerySchema.parse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
    })
    const response = repos.rubrics.listPaginated(query)
    return c.json(learningRubricsListResponseSchema.parse(response))
  })

  return app
}
