import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"

describe("project repositories", () => {
  it("creates, updates, lists active projects, and archives", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({
      name: "Launch Q2",
      description: "Product launch",
      goals: "Ship MVP",
    })
    expect(project.status).toBe("active")

    const updated = ctx.repos.projects.update(project.id, {
      name: "Launch Q2 Updated",
    })
    expect(updated?.name).toBe("Launch Q2 Updated")

    const archived = ctx.repos.projects.archive(project.id)
    expect(archived?.status).toBe("archived")
    expect(archived?.archivedAt).toBeTruthy()

    const activeOnly = ctx.repos.projects.list()
    expect(activeOnly.find((p) => p.id === project.id)).toBeUndefined()

    const withArchived = ctx.repos.projects.list({ includeArchived: true })
    expect(withArchived.find((p) => p.id === project.id)?.status).toBe(
      "archived"
    )

    ctx.cleanup()
  })

  it("manages project memories and enabled state", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Memories" })
    const enabled = ctx.repos.projectMemories.create({
      projectId: project.id,
      content: "Enabled memory",
      enabled: true,
    })
    const disabled = ctx.repos.projectMemories.create({
      projectId: project.id,
      content: "Disabled memory",
      enabled: false,
    })

    const listed = ctx.repos.projectMemories.listByProjectId(project.id)
    expect(listed).toHaveLength(2)

    const toggled = ctx.repos.projectMemories.update(disabled.id, {
      enabled: true,
    })
    expect(toggled?.enabled).toBe(true)

    expect(
      ctx.repos.projectMemories.belongsToProject(enabled.id, project.id)
    ).toBe(true)
    expect(
      ctx.repos.projectMemories.belongsToProject(enabled.id, "other")
    ).toBe(false)

    ctx.repos.projectMemories.delete(enabled.id)
    expect(ctx.repos.projectMemories.getById(enabled.id)).toBeNull()

    ctx.cleanup()
  })

  it("creates and filters documents", () => {
    const ctx = createTestContext()
    const project = ctx.repos.projects.create({ name: "Documents" })
    const thread = ctx.repos.threads.create({
      title: "Thread",
      model: "gpt-4o-mini",
      mode: "plan",
      projectId: project.id,
    })

    const document = ctx.repos.documents.create({
      title: "Q2 Brief",
      documentType: "markdown",
      mimeType: "text/plain",
      sizeBytes: 120,
      storageKey: "documents/test.txt",
      previewText: "Summary",
      projectId: project.id,
      projectNameSnapshot: project.name,
      threadId: thread.id,
      threadTitleSnapshot: thread.title,
    })

    expect(ctx.repos.documents.getById(document.id)?.title).toBe("Q2 Brief")

    const byQuery = ctx.repos.documents.list({ query: "Brief" })
    expect(byQuery).toHaveLength(1)

    const byProject = ctx.repos.documents.list({ projectId: project.id })
    expect(byProject).toHaveLength(1)

    const byType = ctx.repos.documents.list({ documentType: "markdown" })
    expect(byType).toHaveLength(1)

    ctx.cleanup()
  })
})
