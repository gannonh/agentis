import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("thread routes", () => {
  it("lists threads with starred and hasPendingApproval metadata", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const thread = ctx.repos.threads.create({
      title: "Starred thread",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.threads.touch(thread.id, { starred: true })
    const run = ctx.repos.runs.create({
      threadId: thread.id,
      model: "gpt-4o-mini",
      status: "running",
    })
    ctx.repos.steps.create({
      runId: run.id,
      type: "tool-result",
      status: "pending",
      title: "Workspace edit",
      payload: {
        toolCallId: "tool-call-1",
        approval: { status: "pending" },
      },
    })

    const response = await app.request("/api/threads")
    expect(response.status).toBe(200)

    const body = (await response.json()) as Array<{
      id: string
      starred: boolean
      hasPendingApproval: boolean
    }>
    const listed = body.find((item) => item.id === thread.id)
    expect(listed?.starred).toBe(true)
    expect(listed?.hasPendingApproval).toBe(true)
  })

  it("persists starred via PATCH", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const thread = ctx.repos.threads.create({
      title: "Toggle star",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const originalUpdatedAt = thread.updatedAt

    const patch = await app.request(`/api/threads/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: true }),
    })
    expect(patch.status).toBe(200)
    const patched = (await patch.json()) as {
      starred: boolean
      updatedAt: string
    }
    expect(patched.starred).toBe(true)
    expect(patched.updatedAt).toBe(originalUpdatedAt)

    const list = await app.request("/api/threads")
    const body = (await list.json()) as Array<{ id: string; starred: boolean }>
    expect(body.find((item) => item.id === thread.id)?.starred).toBe(true)
  })

  it("rejects PATCH with invalid projectId", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const project = ctx.repos.projects.create({ name: "Archived" })
    ctx.repos.projects.archive(project.id)
    const thread = ctx.repos.threads.create({
      title: "Thread",
      model: "gpt-4o-mini",
      mode: "agent",
    })

    const response = await app.request(`/api/threads/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("project_archived")
  })
})
