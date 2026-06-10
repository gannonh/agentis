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

function invalidLearningPayload(issues: unknown[] = []) {
  return {
    error: "Invalid learning payload",
    code: "invalid_learning_payload",
    issues,
  }
}

function invalidLearningQuery(issues: unknown[] = []) {
  return {
    error: "Invalid learning query",
    code: "invalid_learning_query",
    issues,
  }
}

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
    const parsed = learningPaginationQuerySchema.safeParse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
    })
    if (!parsed.success) {
      return c.json(invalidLearningQuery(parsed.error.issues), 400)
    }

    const response = repos.skills.listPaginated(parsed.data)
    return c.json(learningSkillsListResponseSchema.parse(response))
  })

  app.post("/skills", async (c) => {
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(invalidLearningPayload(), 400)
    }

    const parsed = createLearningSkillRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(invalidLearningPayload(parsed.error.issues), 400)
    }

    const input = parsed.data
    if (input.agentId && !repos.agents.getById(input.agentId)) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }
    const skill = repos.skills.create(input)
    return c.json(learningSkillSchema.parse(skill), 201)
  })

  app.get("/memories", (c) => {
    const parsed = learningMemoriesQuerySchema.safeParse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
      category: c.req.query("category"),
    })
    if (!parsed.success) {
      return c.json(invalidLearningQuery(parsed.error.issues), 400)
    }

    const response = repos.savedMemories.listPaginated(parsed.data)
    return c.json(learningMemoriesListResponseSchema.parse(response))
  })

  app.get("/rubrics", (c) => {
    const parsed = learningPaginationQuerySchema.safeParse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
    })
    if (!parsed.success) {
      return c.json(invalidLearningQuery(parsed.error.issues), 400)
    }

    const response = repos.rubrics.listPaginated(parsed.data)
    return c.json(learningRubricsListResponseSchema.parse(response))
  })

  return app
}
