import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { LocalAppBundleStorage } from "./local-app-bundle-storage.js"
import { AppService } from "./app-service.js"

function createRunContext() {
  const ctx = createTestContext()
  const project = ctx.repos.projects.create({ name: "Apps project" })
  const { thread, run } = ctx.repos.threads.createWithInitialRun({
    title: "Apps thread",
    prompt: "Create an app",
    model: "gpt-4o-mini",
    mode: "agent",
    projectId: project.id,
  })
  const service = new AppService(ctx.repos, ctx.config)
  return { ctx, project, thread, run, service }
}

describe("AppService", () => {
  it("creates and finds App artifacts with versioned bundles and initial state", () => {
    const { ctx, project, thread, run, service } = createRunContext()

    const created = service.createApp({
      title: "Counter",
      description: "Simple counter",
      bundle: {
        html: "<main><p id='count'>0</p></main>",
        css: "main { padding: 1rem; }",
        js: "document.getElementById('count').textContent = '1'",
      },
      initialState: { count: 0 },
      visibilityScope: "project",
      projectId: project.id,
      threadId: thread.id,
      runId: run.id,
    })

    expect(created).toMatchObject({
      ok: true,
      output: {
        title: "Counter",
        version: 1,
        viewPath: expect.stringMatching(/^\/artifacts\//),
        visibilityScope: "project",
      },
    })
    if (!created.ok) throw new Error(created.message)

    const artifact = ctx.repos.artifacts.getById(created.output.artifactId)
    expect(artifact).toMatchObject({
      type: "app",
      contentFormat: "json",
      currentVersion: 1,
    })
    expect(service.getState(created.output.artifactId)).toMatchObject({
      ok: true,
      output: { state: { count: 0 } },
    })

    const storage = new LocalAppBundleStorage(ctx.config)
    expect(storage.read(artifact!.storageKey)).toMatchObject({
      html: expect.stringContaining("count"),
      js: expect.stringContaining("getElementById"),
    })

    const found = service.findApps({
      query: "Counter",
      runContext: { threadId: thread.id, projectId: project.id, runId: run.id },
    })
    expect(found.ok).toBe(true)
    if (!found.ok) throw new Error(found.message)
    expect(found.output.items).toHaveLength(1)
  })

  it("creates a new version on edit while preserving previous versions", () => {
    const { ctx, project, thread, run, service } = createRunContext()
    const created = service.createApp({
      title: "Tracker",
      bundle: {
        html: "<main>v1</main>",
        js: "console.log('v1')",
      },
      projectId: project.id,
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    const edited = service.editApp({
      artifactId: created.output.artifactId,
      bundle: {
        html: "<main>v2</main>",
        js: "console.log('v2')",
      },
      changeSummary: "Updated layout",
      runContext: { threadId: thread.id, projectId: project.id, runId: run.id },
    })
    expect(edited).toMatchObject({
      ok: true,
      output: {
        version: 2,
        previousVersion: 1,
      },
    })

    const versions = ctx.repos.artifacts.listVersions(created.output.artifactId)
    expect(versions.map((entry) => entry.version)).toEqual([1, 2])
    expect(versions[0]?.changeSummary).toBe("Created app")
    expect(versions[1]?.changeSummary).toBe("Updated layout")
  })

  it("rejects invalid bundles before persistence", () => {
    const { project, thread, run, service } = createRunContext()
    const result = service.createApp({
      title: "Bad app",
      bundle: {
        html: "<button onclick=\"alert('x')\">Go</button>",
        js: "console.log('bad')",
      },
      projectId: project.id,
      threadId: thread.id,
      runId: run.id,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_invalid_bundle")
  })

  it("rejects oversized app state", () => {
    const { project, thread, run, service } = createRunContext()
    const created = service.createApp({
      title: "State app",
      bundle: { html: "<main></main>", js: "console.log('ok')" },
      projectId: project.id,
      threadId: thread.id,
      runId: run.id,
    })
    if (!created.ok) throw new Error(created.message)

    const result = service.setState(created.output.artifactId, {
      blob: "x".repeat(70_000),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("app_state_too_large")
  })
})
