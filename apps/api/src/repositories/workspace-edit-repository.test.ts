import { afterEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createPendingEdit() {
  if (!ctx) throw new Error("Missing test context")
  const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
  const created = ctx.repos.threads.createWithInitialRun({
    title: "Create notes",
    prompt: "Create notes",
    mode: "plan",
    model: "gpt-4o-mini",
  })
  return ctx.repos.workspaceEdits.create({
    workspaceId: workspace.id,
    threadId: created.thread.id,
    runId: created.run.id,
    toolCallId: "tool_call_test",
    toolName: "createWorkspaceFile",
    operation: "create",
    path: "notes.md",
    status: "pending",
    approvalMode: "plan",
    input: { path: "notes.md", content: "Alpha" },
  })
}

describe("workspace edit repository", () => {
  it("claims a pending edit only once", () => {
    ctx = createTestContext()
    const edit = createPendingEdit()

    const firstClaim = ctx.repos.workspaceEdits.claimPending(edit.id, "applied")
    const secondClaim = ctx.repos.workspaceEdits.claimPending(edit.id, "denied")

    expect(firstClaim).toMatchObject({ id: edit.id, status: "applied" })
    expect(firstClaim?.appliedAt).toBeUndefined()
    expect(secondClaim).toBeNull()
  })

  it("does not stamp appliedAt when denying an edit", () => {
    ctx = createTestContext()
    const edit = createPendingEdit()

    const denied = ctx.repos.workspaceEdits.claimPending(edit.id, "denied")

    expect(denied).toMatchObject({ id: edit.id, status: "denied" })
    expect(denied?.appliedAt).toBeUndefined()
  })
})
