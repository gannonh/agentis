import { readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "../test/setup.js"
import {
  clearAbortController,
  registerAbortController,
} from "../runtime/abort-registry.js"
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
      finishedAt: expect.any(String),
    })
    await expect(
      readFile(join(context.config.storageRoot, workspace.backendRef, "files", "approved.txt"), "utf8")
    ).resolves.toBe("approved")
  })

  it("does not claim pending commands for a different workspace", async () => {
    const { context, run, handle, service } = await setup("plan")
    await service.executeWorkspaceCommand(handle, {
      threadId: run.threadId,
      runId: run.id,
      toolCallId: "call_exec",
      approvalMode: "plan",
      input: { kind: "command", command: "printf nope" },
    })
    const otherAgent = context.repos.agents.create({
      name: "Other Agent",
      systemPrompt: "Test agent",
      model: "gpt-4o-mini",
    })
    const otherWorkspace = context.repos.workspaces.getDefaultByAgentId(
      otherAgent.id
    )!
    const otherHandle = await new WorkspaceService(
      context.repos,
      context.config
    ).openWorkspace(otherWorkspace.id)

    await expect(
      service.approveByRunToolCall(otherHandle, run.id, "call_exec")
    ).rejects.toMatchObject({
      code: "workspace_execution_workspace_mismatch",
    })
    expect(
      context.repos.workspaceExecutions.getByRunAndToolCall(run.id, "call_exec")
    ).toMatchObject({ status: "pending" })
  })

  it("keeps denied commands pending when approval revalidation fails", async () => {
    const { context, run, handle, service } = await setup("plan")
    await service.executeWorkspaceCommand(handle, {
      threadId: run.threadId,
      runId: run.id,
      toolCallId: "call_exec",
      approvalMode: "plan",
      input: { kind: "command", command: "rm -rf /" },
    })
    context.config.sandboxCommandDenyPatterns = ["rm -rf /"]

    await expect(
      service.approveByRunToolCall(handle, run.id, "call_exec")
    ).rejects.toMatchObject({ code: "sandbox_command_denied" })
    expect(
      context.repos.workspaceExecutions.getByRunAndToolCall(run.id, "call_exec")
    ).toMatchObject({ status: "pending" })
  })

  it("does not start sandbox execution when the run signal is already aborted", async () => {
    const { context, workspace, thread, run, handle, service } =
      await setup("agent")
    const controller = new AbortController()
    registerAbortController(run.id, controller)
    controller.abort()

    try {
      const output = await service.executeWorkspaceCommand(handle, {
        threadId: thread.id,
        runId: run.id,
        toolCallId: "call_exec",
        approvalMode: "agent",
        input: { kind: "command", command: "printf no > aborted.txt" },
      })

      expect(output).toMatchObject({
        exitCode: null,
        aborted: true,
        changedFiles: [],
      })
      await expect(
        stat(
          join(
            context.config.storageRoot,
            workspace.backendRef,
            "files",
            "aborted.txt"
          )
        )
      ).rejects.toThrow()
    } finally {
      clearAbortController(run.id)
    }
  })
})
