import { afterEach, describe, expect, it } from "vitest"
import { createComposioServices } from "../composio/index.js"
import { createApp } from "../app.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("run executor composio bridge", () => {
  it("returns remediation when Slack is requested without grant", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, { ...ctx.config, mockRuntime: true }, services)

    const created = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Post this update to Slack" }),
    })
    const { run } = (await created.json()) as { run: { id: string } }

    const stream = await app.request(`/api/runs/${run.id}/stream`, {
      method: "POST",
    })
    expect(stream.status).toBe(400)
    const failedRun = ctx.repos.runs.getById(run.id)
    expect(failedRun?.status).toBe("failed")
    const steps = ctx.repos.steps.listByRunId(run.id)
    expect(
      steps.some(
        (step) =>
          step.title === "Integration required" ||
          step.payload?.remediation === "toolkit_not_connected"
      )
    ).toBe(true)
  })
})
