import { Hono } from "hono"
import {
  createProjectMemoryRequestSchema,
  createProjectRequestSchema,
  projectMemorySchema,
  projectSchema,
  updateProjectMemoryRequestSchema,
  updateProjectRequestSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { ProjectContextService } from "../projects/project-context-service.js"

export function createProjectRoutes(
  repos: Repositories,
  config: AppConfig
) {
  const app = new Hono()
  const contextService = new ProjectContextService(repos, config)

  app.get("/", (c) => {
    const includeArchived =
      c.req.query("includeArchived") === "true" ||
      c.req.query("includeArchived") === "1"
    const projects = repos.projects.list({ includeArchived })
    return c.json(projects.map((project) => projectSchema.parse(project)))
  })

  app.post("/", async (c) => {
    const body = createProjectRequestSchema.parse(await c.req.json())
    const project = repos.projects.create(body)
    return c.json(projectSchema.parse(project), 201)
  })

  app.get("/:projectId", (c) => {
    const project = repos.projects.getById(c.req.param("projectId"))
    if (!project) {
      return c.json({ error: "Project not found", code: "project_not_found" }, 404)
    }
    return c.json(projectSchema.parse(project))
  })

  app.patch("/:projectId", async (c) => {
    const projectId = c.req.param("projectId")
    const body = updateProjectRequestSchema.parse(await c.req.json())
    const project = repos.projects.update(projectId, body)
    if (!project) {
      return c.json({ error: "Project not found", code: "project_not_found" }, 404)
    }
    return c.json(projectSchema.parse(project))
  })

  app.post("/:projectId/archive", (c) => {
    const project = repos.projects.archive(c.req.param("projectId"))
    if (!project) {
      return c.json({ error: "Project not found", code: "project_not_found" }, 404)
    }
    return c.json(projectSchema.parse(project))
  })

  app.get("/:projectId/memories", (c) => {
    const projectId = c.req.param("projectId")
    if (!repos.projects.getById(projectId)) {
      return c.json({ error: "Project not found", code: "project_not_found" }, 404)
    }
    const memories = repos.projectMemories.listByProjectId(projectId)
    return c.json(memories.map((memory) => projectMemorySchema.parse(memory)))
  })

  app.post("/:projectId/memories", async (c) => {
    const projectId = c.req.param("projectId")
    if (!repos.projects.getById(projectId)) {
      return c.json({ error: "Project not found", code: "project_not_found" }, 404)
    }
    const body = createProjectMemoryRequestSchema.parse(await c.req.json())
    const memory = repos.projectMemories.create({
      projectId,
      content: body.content,
      enabled: body.enabled,
    })
    return c.json(projectMemorySchema.parse(memory), 201)
  })

  app.patch("/:projectId/memories/:memoryId", async (c) => {
    const projectId = c.req.param("projectId")
    const memoryId = c.req.param("memoryId")
    if (!repos.projectMemories.belongsToProject(memoryId, projectId)) {
      return c.json({ error: "Memory not found", code: "memory_not_found" }, 404)
    }
    const body = updateProjectMemoryRequestSchema.parse(await c.req.json())
    const memory = repos.projectMemories.update(memoryId, body)
    if (!memory) {
      return c.json({ error: "Memory not found", code: "memory_not_found" }, 404)
    }
    return c.json(projectMemorySchema.parse(memory))
  })

  app.delete("/:projectId/memories/:memoryId", (c) => {
    const projectId = c.req.param("projectId")
    const memoryId = c.req.param("memoryId")
    if (!repos.projectMemories.belongsToProject(memoryId, projectId)) {
      return c.json({ error: "Memory not found", code: "memory_not_found" }, 404)
    }
    repos.projectMemories.delete(memoryId)
    return c.body(null, 204)
  })

  app.get("/:projectId/context", (c) => {
    const summary = contextService.assemble(c.req.param("projectId"))
    if (!summary) {
      return c.json({ error: "Project not found", code: "project_not_found" }, 404)
    }
    return c.json(summary)
  })

  return app
}
