import { Hono } from "hono"
import { createAgentPromotionDraftResponseSchema } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

function promotionUnavailable() {
  return {
    error: "Only finished threads can be promoted.",
    code: "thread_not_promotable",
  }
}

export function createThreadPromotionRoutes(repos: Repositories) {
  const app = new Hono()

  app.post("/:id/promotion-drafts", (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found", code: "thread_not_found" }, 404)
    }
    if (thread.status !== "finished") {
      return c.json(promotionUnavailable(), 400)
    }

    const existing = repos.agentPromotionDrafts.getLatestByThreadId(thread.id)
    const draft =
      existing ??
      repos.agentPromotionDrafts.createFromThread({
        thread,
        messages: repos.messages.listByThreadId(thread.id),
        toolGrants: repos.toolAccessGrants.listByScope("thread", thread.id),
      })

    return c.json(createAgentPromotionDraftResponseSchema.parse({ draft }), 201)
  })

  return app
}

export function createPromotionDraftRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/:id", (c) => {
    const draft = repos.agentPromotionDrafts.getById(c.req.param("id"))
    if (!draft) {
      return c.json(
        { error: "Promotion draft not found", code: "promotion_draft_not_found" },
        404
      )
    }

    return c.json(createAgentPromotionDraftResponseSchema.parse({ draft }))
  })

  return app
}
