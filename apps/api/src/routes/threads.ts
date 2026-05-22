import { Hono } from "hono"
import {
  createFollowUpRequestSchema,
  createThreadRequestSchema,
  threadDetailSchema,
  threadListItemSchema,
} from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import type { Repositories } from "../repositories/index.js"
import type { AppConfig } from "../config.js"
import { ProjectContextService } from "../projects/project-context-service.js"
import { RunExecutor } from "../runtime/run-executor.js"
import { ArtifactService } from "../artifacts/artifact-service.js"

function summarizeTitle(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, " ")
  if (trimmed.length <= 60) return trimmed
  return `${trimmed.slice(0, 57)}...`
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
      return threadListItemSchema.parse({
        ...thread,
        messageCount: messages.length,
        lastRunStatus: latestRun?.status,
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

    const model = body.model ?? config.defaultModel
    const mode = body.mode ?? "plan"

    const thread = repos.threads.create({
      title: summarizeTitle(body.prompt),
      model,
      mode,
      projectId: body.projectId,
    })

    const message = repos.messages.create({
      threadId: thread.id,
      role: "user",
      parts: [{ type: "text", text: body.prompt }],
      status: "completed",
    })

    const run = repos.runs.create({
      threadId: thread.id,
      model,
      status: "queued",
    })

    repos.steps.create({
      runId: run.id,
      type: "queued",
      status: "pending",
      title: "Queued",
    })

    return c.json({ thread, message, run }, 201)
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
    const message = repos.messages.create({
      threadId: thread.id,
      role: "user",
      parts: [{ type: "text", text: body.prompt }],
      status: "completed",
    })

    const run = repos.runs.create({
      threadId: thread.id,
      model: thread.model,
      status: "queued",
    })

    repos.steps.create({
      runId: run.id,
      type: "queued",
      status: "pending",
      title: "Queued",
    })

    repos.threads.touch(thread.id, { title: summarizeTitle(body.prompt) })

    return c.json({ message, run }, 201)
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

  return app
}
