import { Hono } from "hono"
import {
  acceptLearningSuggestionRequestSchema,
  acceptLearningSuggestionResponseSchema,
  createLearningSkillRequestSchema,
  learningMemoriesListResponseSchema,
  learningMemoriesQuerySchema,
  learningPaginationQuerySchema,
  learningRubricsListResponseSchema,
  learningSkillSchema,
  learningSkillsListResponseSchema,
  learningSuggestionSchema,
  learningSuggestionsListResponseSchema,
  learningSuggestionsQuerySchema,
  learningSummarySchema,
} from "@workspace/shared"
import {
  acceptLearningSuggestion,
  dismissLearningSuggestion,
} from "../learning/learning-suggestion-service.js"
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
      pinnedSkillsCount: repos.skills.countPinned(),
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

  app.get("/suggestions", (c) => {
    const parsed = learningSuggestionsQuerySchema.safeParse({
      page: c.req.query("page"),
      pageSize: c.req.query("pageSize"),
      status: c.req.query("status"),
      threadId: c.req.query("threadId"),
    })
    if (!parsed.success) {
      return c.json(invalidLearningQuery(parsed.error.issues), 400)
    }

    const response = repos.learningSuggestions.listPaginated(parsed.data)
    return c.json(learningSuggestionsListResponseSchema.parse(response))
  })

  app.post("/suggestions/:id/accept", async (c) => {
    let payload: unknown = {}
    try {
      const text = await c.req.text()
      if (text.trim()) payload = JSON.parse(text)
    } catch {
      return c.json(invalidLearningPayload(), 400)
    }

    const parsed = acceptLearningSuggestionRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(invalidLearningPayload(parsed.error.issues), 400)
    }

    const result = acceptLearningSuggestion(
      repos,
      c.req.param("id"),
      parsed.data
    )
    if (!result) {
      return c.json(
        {
          error: "Learning suggestion not found or already resolved",
          code: "learning_suggestion_not_pending",
        },
        404
      )
    }

    return c.json(acceptLearningSuggestionResponseSchema.parse(result))
  })

  app.post("/suggestions/:id/dismiss", (c) => {
    const suggestion = dismissLearningSuggestion(repos, c.req.param("id"))
    if (!suggestion) {
      return c.json(
        {
          error: "Learning suggestion not found or already resolved",
          code: "learning_suggestion_not_pending",
        },
        404
      )
    }

    return c.json(learningSuggestionSchema.parse(suggestion))
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
