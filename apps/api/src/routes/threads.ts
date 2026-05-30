import { Hono } from "hono"
import { z } from "zod"
import {
  createFollowUpRequestSchema,
  createThreadRequestSchema,
  threadDetailSchema,
  threadListItemSchema,
  threadSchema,
  updateThreadRequestSchema,
} from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import type { Repositories } from "../repositories/index.js"
import type { AppConfig } from "../config.js"
import { ArtifactService } from "../artifacts/artifact-service.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantRemediation,
} from "../agents/tool-grant-resolution.js"
import { summarizeTitle } from "../lib/title-summary.js"
import { toSourceWorkflowSnapshot } from "../lib/source-workflow-snapshot.js"
import { ProjectContextService } from "../projects/project-context-service.js"
import { RunExecutor } from "../runtime/run-executor.js"
import { GENERIC_AGENTIS_AGENT_ID } from "../workspaces/constants.js"
import { WorkspaceError } from "../workspaces/workspace-service.js"

function summarizeThreadPreview(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, " ")
  if (trimmed.length <= 160) return trimmed
  return `${trimmed.slice(0, 157)}...`
}

function firstUserMessageText(
  messages: { role: string; parts: { type: string; text?: string }[] }[]
) {
  const message = messages.find((item) => item.role === "user")
  if (!message) return null
  const textPart = message.parts.find(
    (part) => part.type === "text" && typeof part.text === "string"
  )
  return textPart?.text?.trim() ? summarizeThreadPreview(textPart.text) : null
}

export function createThreadRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()
  const contextService = new ProjectContextService(repos, config)

  app.get("/", (c) => {
    const threads = repos.threads.list().map((thread) => {
      const messages = repos.messages.listByThreadId(thread.id)
      const latestRun = repos.runs.getLatestByThreadId(thread.id)
      const artifactCount = repos.artifacts.list({ threadId: thread.id }).length
      return threadListItemSchema.parse({
        ...thread,
        messageCount: messages.length,
        lastRunStatus: latestRun?.status,
        summary: firstUserMessageText(messages),
        artifactCount,
      })
    })
    return c.json(threads)
  })

  app.post("/", async (c) => {
    const body = createThreadRequestSchema.parse(await c.req.json())
    const projectValidation = contextService.validateProjectForNewThread(
      body.projectId
    )
    if (!projectValidation.ok) {
      return c.json(
        {
          error: projectValidation.message,
          code: projectValidation.code,
        },
        400
      )
    }

    const mode = body.mode ?? "plan"
    const selectedAgentId = body.agentId ?? GENERIC_AGENTIS_AGENT_ID

    if (selectedAgentId !== GENERIC_AGENTIS_AGENT_ID) {
      const agent = repos.agents.getById(selectedAgentId)
      if (!agent) {
        return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
      }

      const version = repos.agents.getCurrentConfigurationSnapshot(agent.id)
      const resolvedGrants = resolveRequestedAgentGrants(
        repos,
        version.toolGrants
      )
      if ("error" in resolvedGrants) {
        return c.json(
          {
            error: resolvedGrants.error,
            remediation: toolkitGrantRemediation(resolvedGrants.error),
          },
          400
        )
      }

      const created = repos.threads.createWithInitialRun({
        title: summarizeTitle(body.prompt),
        prompt: body.prompt,
        model: version.model,
        mode,
        projectId: body.projectId,
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        agentConfigurationVersionId: version.id,
        ...toSourceWorkflowSnapshot({
          sourceThread: agent.sourceThread,
          sourceWorkflow: agent.sourceWorkflow,
        }),
        toolGrants: resolvedGrants.grants,
      })

      return c.json(created, 201)
    }

    const created = repos.threads.createWithInitialRun({
      title: summarizeTitle(body.prompt),
      prompt: body.prompt,
      model: body.model ?? config.defaultModel,
      mode,
      projectId: body.projectId,
      agentId: GENERIC_AGENTIS_AGENT_ID,
    })

    return c.json(created, 201)
  })

  app.patch("/:id", async (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const body = updateThreadRequestSchema.parse(await c.req.json())
    if (body.projectId !== undefined && body.projectId !== null) {
      const projectValidation = contextService.validateProjectForNewThread(
        body.projectId
      )
      if (!projectValidation.ok) {
        return c.json(
          {
            error: projectValidation.message,
            code: projectValidation.code,
          },
          400
        )
      }
    }

    const updated = repos.threads.touch(thread.id, {
      projectId: body.projectId,
    })
    if (!updated) {
      return c.json({ error: "Thread not found" }, 404)
    }
    return c.json(threadSchema.parse(updated))
  })

  app.get("/:id", (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const messages = repos.messages.listByThreadId(thread.id)
    const runs = repos.runs.listByThreadId(thread.id)
    const steps = repos.steps.listByRunIds(runs.map((run) => run.id))

    const projectContext = contextService.assemble(thread.projectId)

    return c.json(
      threadDetailSchema.parse({
        thread,
        messages,
        runs,
        steps,
        projectContext,
      })
    )
  })

  app.post("/:id/messages", async (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const body = createFollowUpRequestSchema.parse(await c.req.json())
    const created = repos.threads.createFollowUpRun({
      threadId: thread.id,
      prompt: body.prompt,
      title: summarizeTitle(body.prompt),
    })
    if (!created) {
      return c.json({ error: "Thread not found" }, 404)
    }

    return c.json(created, 201)
  })

  return app
}

export function createRunRoutes(
  repos: Repositories,
  config: AppConfig,
  services: ComposioServices
) {
  const app = new Hono()
  const artifactService = new ArtifactService(repos, config)
  const executor = new RunExecutor(repos, config, services, artifactService)

  app.post("/:id/stream", async (c) => {
    try {
      const response = await executor.executeStream(c.req.param("id"))
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stream failed"
      const status = message.includes("not found") ? 404 : 400
      return c.json({ error: message }, status)
    }
  })

  app.post("/:id/abort", (c) => {
    const run = executor.abort(c.req.param("id"))
    if (!run) {
      return c.json({ error: "Run not found" }, 404)
    }
    return c.json({ run })
  })

  app.post("/:id/tool-approvals/:toolCallId", async (c) => {
    const body = z
      .object({ decision: z.enum(["approve", "deny"]) })
      .parse(await c.req.json())
    try {
      const result = await executor.decideWorkspaceToolApproval(
        c.req.param("id"),
        c.req.param("toolCallId"),
        body.decision
      )
      return c.json({ edit: result.edit, output: result.output })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval failed"
      const code = error instanceof WorkspaceError ? error.code : "approval_failed"
      const status = code.includes("not_found") ? 404 : 400
      return c.json({ error: message, code }, status)
    }
  })

  return app
}
