import type { ThreadMode } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import {
  parseWorkspaceExecutionInput,
  type RunWorkspaceCommandInput,
} from "../native-tools/workspace-execution-schemas.js"
import { createSandboxBackend } from "../sandbox/index.js"
import { registerSandboxExecution } from "../sandbox/execution-registry.js"
import {
  captureWorkspaceFileSnapshot,
  diffWorkspaceFileSnapshots,
  type WorkspaceChangedFile,
} from "../sandbox/workspace-file-snapshot.js"
import type { SandboxExecuteResult } from "../sandbox/types.js"
import { getAbortSignal } from "../runtime/abort-registry.js"
import type {
  WorkspaceExecutionRecord,
  WorkspaceExecutionRepository,
} from "../repositories/workspace-execution-repository.js"
import {
  WorkspaceError,
  type WorkspaceHandle,
} from "./workspace-service.js"
import {
  buildAppliedExecutionOutput,
  buildDeniedExecutionOutput,
  buildPendingExecutionOutput,
  type WorkspaceExecutionToolOutput,
} from "./workspace-execution-output.js"

const TOOL_NAME = "runWorkspaceCommand"
function sanitizeInput(input: RunWorkspaceCommandInput): Record<string, unknown> {
  if (input.kind === "command") {
    return {
      kind: input.kind,
      command: input.command,
      cwd: input.cwd,
    }
  }
  return {
    kind: input.kind,
    language: input.language,
    code: input.code,
    cwd: input.cwd,
  }
}

function outputRecord(output: WorkspaceExecutionToolOutput) {
  return {
    exitCode: output.exitCode,
    durationMs: output.durationMs,
    stdout: output.stdout,
    stderr: output.stderr,
    stdoutTruncated: output.stdoutTruncated,
    stderrTruncated: output.stderrTruncated,
    timedOut: output.timedOut,
    aborted: output.aborted,
    status: output.status,
  }
}

export class WorkspaceExecutionService {
  constructor(
    private readonly executions: WorkspaceExecutionRepository,
    private readonly config: AppConfig
  ) {}

  createPending(input: {
    workspaceId: string
    threadId: string
    runId: string
    toolCallId: string
    approvalMode: ThreadMode
    toolInput: RunWorkspaceCommandInput
  }) {
    return this.executions.create({
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      toolName: TOOL_NAME,
      kind: input.toolInput.kind,
      status: "pending",
      approvalMode: input.approvalMode,
      input: sanitizeInput(input.toolInput),
      result: { status: "pending_approval" },
      changedFiles: [],
    })
  }

  async executeWorkspaceCommand(
    handle: WorkspaceHandle,
    input: {
      threadId: string
      runId: string
      toolCallId: string
      approvalMode: ThreadMode
      input: RunWorkspaceCommandInput
    }
  ): Promise<WorkspaceExecutionToolOutput> {
    this.assertAllowed(input.input)
    if (input.approvalMode === "plan") {
      const execution = this.createPending({
        workspaceId: handle.id,
        threadId: input.threadId,
        runId: input.runId,
        toolCallId: input.toolCallId,
        approvalMode: input.approvalMode,
        toolInput: input.input,
      })
      return buildPendingExecutionOutput({
        workspaceId: handle.id,
        executionId: execution.id,
        kind: input.input.kind,
      })
    }

    const execution = this.createPending({
      workspaceId: handle.id,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      approvalMode: input.approvalMode,
      toolInput: input.input,
    })
    return this.runAndRecord(handle, execution, input.input)
  }

  async approveByRunToolCall(
    handle: WorkspaceHandle,
    runId: string,
    toolCallId: string
  ): Promise<{ executionId: string; output: WorkspaceExecutionToolOutput }> {
    const execution = this.executions.getByRunAndToolCall(runId, toolCallId)
    if (!execution) {
      throw new WorkspaceError(
        "workspace_execution_not_found",
        "Workspace execution not found."
      )
    }
    if (execution.status !== "pending") {
      throw new WorkspaceError(
        "workspace_execution_not_pending",
        "Workspace execution is not pending approval."
      )
    }
    const claimed = this.executions.claimPending(execution.id, "applied")
    if (!claimed) {
      throw new WorkspaceError(
        "workspace_execution_not_pending",
        "Workspace execution is not pending approval."
      )
    }
    const parsed = parseWorkspaceExecutionInput(execution.input)
    this.assertAllowed(parsed)
    const output = await this.runAndRecord(handle, claimed, parsed)
    return { executionId: execution.id, output }
  }

  denyByRunToolCall(runId: string, toolCallId: string) {
    const execution = this.executions.getByRunAndToolCall(runId, toolCallId)
    if (!execution) {
      throw new WorkspaceError(
        "workspace_execution_not_found",
        "Workspace execution not found."
      )
    }
    if (execution.status !== "pending") {
      throw new WorkspaceError(
        "workspace_execution_not_pending",
        "Workspace execution is not pending approval."
      )
    }
    const updated = this.executions.claimPending(execution.id, "denied")
    if (!updated) {
      throw new WorkspaceError(
        "workspace_execution_not_pending",
        "Workspace execution is not pending approval."
      )
    }
    return (
      this.executions.update(execution.id, {
        status: "denied",
        result: { status: "denied" },
        changedFiles: [],
      }) ?? updated
    )
  }

  private assertAllowed(input: RunWorkspaceCommandInput) {
    if (input.kind !== "command") return
    const denied = this.config.sandboxCommandDenyPatterns.find((pattern) =>
      input.command.includes(pattern)
    )
    if (denied) {
      throw new WorkspaceError(
        "sandbox_command_denied",
        `Command matches denied sandbox pattern: ${denied}`
      )
    }
  }

  private async runAndRecord(
    handle: WorkspaceHandle,
    execution: WorkspaceExecutionRecord,
    toolInput: RunWorkspaceCommandInput
  ): Promise<WorkspaceExecutionToolOutput> {
    try {
      const result = await this.runSandbox(handle, execution.id, execution.runId, toolInput)
      const output = buildAppliedExecutionOutput({
        workspaceId: handle.id,
        executionId: execution.id,
        kind: toolInput.kind,
        result: result.result,
        changedFiles: result.changedFiles,
      })
      this.executions.update(execution.id, {
        status: output.aborted ? "aborted" : output.timedOut ? "failed" : "applied",
        result: outputRecord(output),
        changedFiles: output.changedFiles,
      })
      return output
    } catch (error) {
      this.executions.update(execution.id, {
        status: "failed",
        result: {
          status: "failed",
          error: error instanceof Error ? error.message : "Workspace execution failed.",
        },
        changedFiles: [],
      })
      throw error
    }
  }

  private async runSandbox(
    handle: WorkspaceHandle,
    executionId: string,
    runId: string,
    input: RunWorkspaceCommandInput
  ): Promise<{
    result: SandboxExecuteResult
    changedFiles: WorkspaceChangedFile[]
  }> {
    const filesRoot = await handle.getFilesRootRealPath()
    const cwd = await handle.resolveExecutionCwd(input.cwd)
    const before = await captureWorkspaceFileSnapshot(filesRoot, {
      maxFiles: this.config.workspaceListLimit,
      maxFileBytes: this.config.workspaceWriteMaxBytes,
    })
    const controller = new AbortController()
    const unregister = registerSandboxExecution(runId, controller)
    const runAbortSignal = getAbortSignal(runId)
    const abort = () => controller.abort()
    runAbortSignal?.addEventListener("abort", abort, { once: true })
    try {
      const result = await createSandboxBackend(this.config).execute(
        {
          workspaceId: handle.id,
          filesRoot,
          kind: input.kind,
          command: input.kind === "command" ? input.command : undefined,
          argv: await this.argvForScript(handle, executionId, input),
          cwd: cwd.absolutePath,
          timeoutMs: this.config.sandboxTimeoutMs,
          maxStdoutBytes: this.config.sandboxMaxStdoutBytes,
          maxStderrBytes: this.config.sandboxMaxStderrBytes,
        },
        controller.signal
      )
      const after = await captureWorkspaceFileSnapshot(filesRoot, {
        maxFiles: this.config.workspaceListLimit,
        maxFileBytes: this.config.workspaceWriteMaxBytes,
      })
      return {
        result,
        changedFiles: diffWorkspaceFileSnapshots(
          before,
          after,
          this.config.sandboxChangedFilesLimit
        ),
      }
    } finally {
      runAbortSignal?.removeEventListener("abort", abort)
      unregister()
    }
  }

  private async argvForScript(
    handle: WorkspaceHandle,
    executionId: string,
    input: RunWorkspaceCommandInput
  ) {
    if (input.kind !== "script") return undefined
    const scriptPath = await handle.materializeRuntimeScript({
      executionId,
      language: input.language,
      code: input.code,
    })
    return [input.language === "python" ? "python3" : "node", scriptPath]
  }
}
