import { Hono } from "hono"
import type { z } from "zod"
import {
  agentWebhookSchema,
  createAgentWebhookRequestSchema,
  createAgentWebhookResponseSchema,
  rotateAgentWebhookSecretResponseSchema,
  updateAgentWebhookRequestSchema,
  type AgentWebhook,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

function invalidAgentWebhookPayload(issues: z.ZodIssue[] = []) {
  return {
    error: "Invalid agent webhook payload",
    code: "invalid_agent_webhook",
    issues,
  } as const
}

function validateWebhookProject(
  repos: Repositories,
  projectId?: string | null
): Response | null {
  if (!projectId) return null
  const project = repos.projects.getById(projectId)
  if (!project || project.status === "archived") {
    return new Response(
      JSON.stringify({
        error: "Project is not available for webhook runs.",
        code: "invalid_webhook_project",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
  return null
}

function getOwnedWebhook(
  repos: Repositories,
  agentId: string,
  webhookId: string
): AgentWebhook | null {
  const webhook = repos.agentWebhooks.getById(webhookId)
  if (!webhook || webhook.agentId !== agentId) return null
  return webhook
}

export function createAgentWebhookRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/", (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    return c.json(
      repos.agentWebhooks
        .listByAgentId(agentId)
        .map((webhook) => agentWebhookSchema.parse(webhook))
    )
  })

  app.post("/", async (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(invalidAgentWebhookPayload(), 400)
    }

    const parsed = createAgentWebhookRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(invalidAgentWebhookPayload(parsed.error.issues), 400)
    }

    const projectError = validateWebhookProject(repos, parsed.data.projectId)
    if (projectError) return projectError

    const created = repos.agentWebhooks.create({
      ...parsed.data,
      agentId,
    })
    return c.json(
      createAgentWebhookResponseSchema.parse({
        ...created.webhook,
        secret: created.secret,
      }),
      201
    )
  })

  app.patch("/:webhookId", async (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const webhookId = c.req.param("webhookId")
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    const existing = getOwnedWebhook(repos, agentId, webhookId)
    if (!existing) {
      return c.json(
        { error: "Webhook not found", code: "agent_webhook_not_found" },
        404
      )
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(invalidAgentWebhookPayload(), 400)
    }

    const parsed = updateAgentWebhookRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(invalidAgentWebhookPayload(parsed.error.issues), 400)
    }

    const projectId =
      parsed.data.projectId !== undefined
        ? parsed.data.projectId
        : existing.projectId
    const nextStatus = parsed.data.status ?? existing.status
    const projectAssignmentChanged = parsed.data.projectId !== undefined
    const shouldValidateProject =
      Boolean(projectId) &&
      (nextStatus === "enabled" || projectAssignmentChanged)
    if (shouldValidateProject) {
      const projectError = validateWebhookProject(repos, projectId)
      if (projectError) return projectError
    }

    const updated = repos.agentWebhooks.update(webhookId, parsed.data)
    return c.json(agentWebhookSchema.parse(updated))
  })

  app.delete("/:webhookId", (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const webhookId = c.req.param("webhookId")
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    const existing = getOwnedWebhook(repos, agentId, webhookId)
    if (!existing) {
      return c.json(
        { error: "Webhook not found", code: "agent_webhook_not_found" },
        404
      )
    }

    repos.agentWebhooks.delete(webhookId)
    return c.body(null, 204)
  })

  app.post("/:webhookId/rotate-secret", (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const webhookId = c.req.param("webhookId")
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    const existing = getOwnedWebhook(repos, agentId, webhookId)
    if (!existing) {
      return c.json(
        { error: "Webhook not found", code: "agent_webhook_not_found" },
        404
      )
    }

    const rotated = repos.agentWebhooks.rotateSecret(webhookId)
    if (!rotated) {
      return c.json(
        { error: "Webhook not found", code: "agent_webhook_not_found" },
        404
      )
    }

    return c.json(
      rotateAgentWebhookSecretResponseSchema.parse({
        webhook: rotated.webhook,
        secret: rotated.secret,
      })
    )
  })

  return app
}
