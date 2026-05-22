import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("project routes", () => {
  it("creates, updates, archives projects and manages memories", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const created = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Launch",
        goals: "Ship MVP",
      }),
    })
    expect(created.status).toBe(201)
    const project = (await created.json()) as { id: string; name: string }

    const memory = await app.request(`/api/projects/${project.id}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Pricing notes", enabled: true }),
    })
    expect(memory.status).toBe(201)

    const archived = await app.request(`/api/projects/${project.id}/archive`, {
      method: "POST",
    })
    expect(archived.status).toBe(200)
    const archivedBody = (await archived.json()) as { status: string }
    expect(archivedBody.status).toBe("archived")

    const activeList = await app.request("/api/projects")
    const activeBody = (await activeList.json()) as { id: string }[]
    expect(activeBody.find((p) => p.id === project.id)).toBeUndefined()
  })

  it("rejects thread creation for archived project", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const project = ctx.repos.projects.create({ name: "Archived" })
    ctx.repos.projects.archive(project.id)

    const response = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Start thread",
        projectId: project.id,
      }),
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("project_archived")
  })

  it("includes project context on thread detail", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const project = ctx.repos.projects.create({
      name: "Context",
      goals: "Stay aligned",
    })
    ctx.repos.projectMemories.create({
      projectId: project.id,
      content: "Remember tone",
      enabled: true,
    })
    const thread = ctx.repos.threads.create({
      title: "Thread",
      model: "gpt-4o-mini",
      mode: "plan",
      projectId: project.id,
    })

    const response = await app.request(`/api/threads/${thread.id}`)
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      projectContext?: { project: { name: string }; enabledMemoryCount: number }
    }
    expect(body.projectContext?.project.name).toBe("Context")
    expect(body.projectContext?.enabledMemoryCount).toBe(1)
  })
})
