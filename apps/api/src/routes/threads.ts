import { Hono } from "hono"
import { z } from "zod"
import {
  createFollowUpRequestSchema,
  createThreadRequestSchema,
  resolveSelectableGatewayModel,
  runSchema,
  threadDetailSchema,
  threadListItemSchema,
  threadListSummaryFromMessages,
  threadSchema,
  updateThreadRequestSchema,
} from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import type { Repositories } from "../repositories/index.js"
import type { AppConfig } from "../config.js"
import { DocumentService } from "../documents/document-service.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantErrorMessage,
  toolkitGrantRemediation,
  type ResolvedAgentToolGrant,
} from "../agents/tool-grant-resolution.js"
import { summarizeTitle } from "../lib/title-summary.js"
import { toSourceWorkflowSnapshot } from "../lib/source-workflow-snapshot.js"
import { ProjectContextService } from "../projects/project-context-service.js"
import { RunExecutor } from "../runtime/run-executor.js"
import { GENERIC_AGENTIS_AGENT_ID } from "../workspaces/constants.js"
import { WorkspaceError } from "../workspaces/workspace-service.js"

export function createThreadRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()
  const contextService = new ProjectContextService(repos, config)

  app.get("/", (c) => {
    const threads = repos.threads.list()
    const threadIds = threads.map((thread) => thread.id)
    const messagesByThreadId = repos.messages.listByThreadIds(threadIds)
    const latestRuns = repos.runs.listLatestByThreadIds(threadIds)
    const documentCounts = repos.documents.countByThreadIds(threadIds)

    const items = threads.map((thread) => {
      const messages = messagesByThreadId.get(thread.id) ?? []
      return threadListItemSchema.parse({
        ...thread,
        messageCount: messages.length,
        lastRunStatus: latestRuns.get(thread.id)?.status,
        summary: threadListSummaryFromMessages(messages),
        documentCount: documentCounts.get(thread.id) ?? 0,
      })
    })
    return c.json(items)
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
            error: toolkitGrantErrorMessage(resolvedGrants.error),
            code: resolvedGrants.error,
            remediation: toolkitGrantRemediation(resolvedGrants.error),
          },
          400
        )
      }

      const created = repos.threads.createWithInitialRun({
        title: summarizeTitle(body.prompt),
        prompt: body.prompt,
        model: resolveSelectableGatewayModel(
          body.model !== undefined ? body.model : version.model,
          config.aiGatewayProvider
        ),
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

    const requestedGrants = body.toolGrants ?? []
    const resolvedGrants =
      requestedGrants.length > 0
        ? resolveRequestedAgentGrants(repos, requestedGrants)
        : { grants: [] as ResolvedAgentToolGrant[] }
    if ("error" in resolvedGrants) {
      return c.json(
        {
          error: toolkitGrantErrorMessage(resolvedGrants.error),
          code: resolvedGrants.error,
          remediation: toolkitGrantRemediation(resolvedGrants.error),
        },
        400
      )
    }

    const created = repos.threads.createWithInitialRun({
      title: summarizeTitle(body.prompt),
      prompt: body.prompt,
      model: resolveSelectableGatewayModel(
        body.model ?? config.defaultModel,
        config.aiGatewayProvider
      ),
      mode,
      projectId: body.projectId,
      agentId: GENERIC_AGENTIS_AGENT_ID,
      toolGrants: resolvedGrants.grants,
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
      mode: body.mode,
      model:
        body.model !== undefined
          ? resolveSelectableGatewayModel(body.model, config.aiGatewayProvider)
          : undefined,
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
  const documentService = new DocumentService(repos, config)
  const executor = new RunExecutor(repos, config, services, documentService)

  app.get("/:id", (c) => {
    const run = repos.runs.getById(c.req.param("id"))
    if (!run) {
      return c.json({ error: "Run not found", code: "run_not_found" }, 404)
    }
    return c.json(runSchema.parse(run))
  })

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
      return c.json({ edit: result.action, action: result.action, output: result.output })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval failed"
      const code = error instanceof WorkspaceError ? error.code : "approval_failed"
      const status = code.includes("not_found") ? 404 : 400
      return c.json({ error: message, code }, status)
    }
  })

  return app
}
