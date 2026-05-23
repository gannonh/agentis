import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("artifact routes", () => {
  it("uploads, lists, filters, and downloads artifacts", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)
    const project = ctx.repos.projects.create({ name: "Docs" })

    const form = new FormData()
    form.set("title", "Q2 Brief")
    form.set("type", "document")
    form.set("projectId", project.id)
    form.set(
      "file",
      new File(["# Brief\n\nSummary"], "brief.md", { type: "text/markdown" })
    )

    const uploaded = await app.request("/api/artifacts", {
      method: "POST",
      body: form,
    })
    expect(uploaded.status).toBe(201)
    const artifact = (await uploaded.json()) as {
      id: string
      projectNameSnapshot?: string
    }
    expect(artifact.projectNameSnapshot).toBe("Docs")

    const listed = await app.request("/api/artifacts?query=Brief")
    const listBody = (await listed.json()) as { id: string }[]
    expect(listBody).toHaveLength(1)

    const download = await app.request(
      `/api/artifacts/${artifact.id}/download`
    )
    expect(download.status).toBe(200)
    expect(download.headers.get("content-type")).toContain("text")
    expect(await download.text()).toContain("Brief")
  })

  it("returns 400 for invalid list query parameters", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const response = await app.request("/api/artifacts?type=not-a-type")
    expect(response.status).toBe(400)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("invalid_request")
  })

  it("returns artifact_blob_missing when file is absent", async () => {
    ctx = createTestContext()
    const services = createComposioServices(ctx.repos, ctx.config)
    const app = createApp(ctx.repos, ctx.config, services)

    const artifact = ctx.repos.artifacts.create({
      title: "Missing",
      type: "document",
      mimeType: "text/plain",
      sizeBytes: 1,
      storageKey: "artifacts/missing.txt",
    })

    const response = await app.request(
      `/api/artifacts/${artifact.id}/download`
    )
    expect(response.status).toBe(404)
    const body = (await response.json()) as { code: string }
    expect(body.code).toBe("artifact_blob_missing")
  })
})
