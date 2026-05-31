import { readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "../test/setup.js"
import { WorkspaceService } from "./workspace-service.js"
import { WorkspaceExecutionService } from "./workspace-execution-service.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

async function setup(mode: "plan" | "agent" = "agent") {
  ctx = createTestContext()
  const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
  const thread = ctx.repos.threads.create({
    title: "Sandbox test",
    model: "gpt-4o-mini",
    mode,
    workspaceId: workspace.id,
  })
  const run = ctx.repos.runs.create({
    threadId: thread.id,
    model: "gpt-4o-mini",
    status: "running",
  })
  const handle = await new WorkspaceService(ctx.repos, ctx.config).openWorkspace(
    workspace.id
  )
  const service = new WorkspaceExecutionService(
    ctx.repos.workspaceExecutions,
    ctx.config
  )
  return { context: ctx, workspace, thread, run, handle, service }
}

describe("WorkspaceExecutionService", () => {
  it("creates a pending approval in plan mode without running the command", async () => {
    const { context, workspace, thread, run, handle, service } = await setup("plan")

    const output = await service.executeWorkspaceCommand(handle, {
      threadId: thread.id,
      runId: run.id,
      toolCallId: "call_exec",
      approvalMode: "plan",
      input: { kind: "command", command: "printf hello > plan-output.txt" },
    })

    expect(output).toMatchObject({
      workspaceId: workspace.id,
      kind: "command",
      status: "pending_approval",
      changedFiles: [],
    })
    expect(context.repos.workspaceExecutions.getPendingByRunId(run.id)).toMatchObject({
      status: "pending",
      toolCallId: "call_exec",
      approvalMode: "plan",
    })
    await expect(
      stat(join(context.config.storageRoot, workspace.backendRef, "files", "plan-output.txt"))
    ).rejects.toThrow()
  })

  it("executes immediately in agent mode and records changed files", async () => {
    const { context, workspace, thread, run, handle, service } = await setup("agent")

    const output = await service.executeWorkspaceCommand(handle, {
      threadId: thread.id,
      runId: run.id,
      toolCallId: "call_exec",
      approvalMode: "agent",
      input: { kind: "command", command: "printf hello > created.txt" },
    })

    expect(output).toMatchObject({
      workspaceId: workspace.id,
      kind: "command",
      exitCode: 0,
      stdout: "",
      timedOut: false,
      aborted: false,
      changedFiles: [{ path: "created.txt", operation: "created" }],
    })
    expect(context.repos.workspaceExecutions.getByRunAndToolCall(run.id, "call_exec")).toMatchObject({
      status: "applied",
      result: expect.objectContaining({ exitCode: 0 }),
    })
    await expect(
      readFile(join(context.config.storageRoot, workspace.backendRef, "files", "created.txt"), "utf8")
    ).resolves.toBe("hello")
  })

  it("approves pending commands using the original tool call input", async () => {
    const { context, workspace, thread, run, handle, service } = await setup("plan")
    await service.executeWorkspaceCommand(handle, {
      threadId: thread.id,
      runId: run.id,
      toolCallId: "call_exec",
      approvalMode: "plan",
      input: { kind: "command", command: "printf approved > approved.txt" },
    })

    const approved = await service.approveByRunToolCall(
      handle,
      run.id,
      "call_exec"
    )

    expect(approved.output.changedFiles).toEqual([
      { path: "approved.txt", operation: "created" },
    ])
    expect(context.repos.workspaceExecutions.getById(approved.executionId)).toMatchObject({
      status: "applied",
    })
    await expect(
      readFile(join(context.config.storageRoot, workspace.backendRef, "files", "approved.txt"), "utf8")
    ).resolves.toBe("approved")
  })
})
