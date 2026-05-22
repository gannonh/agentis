import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { ProjectContextService } from "./project-context-service.js"

describe("ProjectContextService", () => {
  it("assembles goals and enabled memories with truncation metadata", () => {
    const ctx = createTestContext()
    const service = new ProjectContextService(ctx.repos, {
      ...ctx.config,
      projectGoalsMaxChars: 10,
      projectMemoryMaxChars: 8,
    })
    const project = ctx.repos.projects.create({
      name: "Goals",
      goals: "A very long goals block for truncation",
    })
    ctx.repos.projectMemories.create({
      projectId: project.id,
      content: "Enabled long memory content",
      enabled: true,
    })
    ctx.repos.projectMemories.create({
      projectId: project.id,
      content: "Disabled",
      enabled: false,
    })

    const summary = service.assemble(project.id)
    expect(summary?.enabledMemoryCount).toBe(1)
    expect(summary?.memories).toHaveLength(1)
    expect(summary?.truncated).toBe(true)
    expect(service.buildSystemPromptBlock(summary!)).toContain("Goals")

    ctx.cleanup()
  })

  it("rejects missing and archived projects for new threads", () => {
    const ctx = createTestContext()
    const service = new ProjectContextService(ctx.repos, ctx.config)
    const archived = ctx.repos.projects.create({ name: "Old" })
    ctx.repos.projects.archive(archived.id)

    expect(service.validateProjectForNewThread("missing")).toMatchObject({
      ok: false,
      code: "project_not_found",
    })
    expect(service.validateProjectForNewThread(archived.id)).toMatchObject({
      ok: false,
      code: "project_archived",
    })
    expect(service.validateProjectForNewThread(undefined)).toEqual({ ok: true })

    ctx.cleanup()
  })
})
