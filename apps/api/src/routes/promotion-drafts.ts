import { Hono } from "hono"
import {
  createAgentFromPromotionDraftRequestSchema,
  createAgentPromotionDraftResponseSchema,
  updateAgentPromotionDraftRequestSchema,
} from "@workspace/shared"
import { AgentPromotionService } from "../agents/agent-promotion-service.js"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"

function promotionDraftNotFound() {
  return {
    error: "Promotion draft not found",
    code: "promotion_draft_not_found",
  }
}

function invalidPromotionDraftPayload(issues: unknown[] = []) {
  return {
    error: "Invalid promotion draft payload",
    code: "invalid_promotion_draft",
    issues,
  }
}

export function createThreadPromotionRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()
  const service = new AgentPromotionService(repos, config)

  app.post("/:id/promotion-drafts", (c) => {
    const result = service.createDraftFromThread(c.req.param("id"))
    if (!result.ok) {
      return c.json(result.error.body, result.error.status)
    }

    return c.json(
      createAgentPromotionDraftResponseSchema.parse({
        draft: result.data.draft,
      }),
      result.data.created ? 201 : 200
    )
  })

  return app
}

export function createPromotionDraftRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()
  const service = new AgentPromotionService(repos, config)

  app.get("/:id", (c) => {
    const draft = repos.agentPromotionDrafts.getById(c.req.param("id"))
    if (!draft) {
      return c.json(promotionDraftNotFound(), 404)
    }

    return c.json(createAgentPromotionDraftResponseSchema.parse({ draft }))
  })

  app.patch("/:id", async (c) => {
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(invalidPromotionDraftPayload(), 400)
    }

    const parsed = updateAgentPromotionDraftRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(invalidPromotionDraftPayload(parsed.error.issues), 400)
    }

    const draft = repos.agentPromotionDrafts.update(c.req.param("id"), parsed.data)
    if (!draft) {
      return c.json(promotionDraftNotFound(), 404)
    }

    return c.json(createAgentPromotionDraftResponseSchema.parse({ draft }))
  })

  app.post("/:id/create-agent", async (c) => {
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(invalidPromotionDraftPayload(), 400)
    }

    const parsed = createAgentFromPromotionDraftRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(invalidPromotionDraftPayload(parsed.error.issues), 400)
    }

    const result = service.createAgentFromDraft(c.req.param("id"), parsed.data)
    if (!result.ok) {
      return c.json(result.error.body, result.error.status)
    }

    return c.json(result.data, 201)
  })

  return app
}
