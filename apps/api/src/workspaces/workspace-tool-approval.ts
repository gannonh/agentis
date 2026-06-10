import { formatNativeToolRunStepPayload } from "../native-tools/native-tool-payload.js"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import type { WorkspaceEditRecord } from "../repositories/workspace-edit-repository.js"
import type { WorkspaceExecutionRecord } from "../repositories/workspace-execution-repository.js"
import { evaluateCompletedRun } from "../evaluation/run-evaluator.js"
import { nowIso } from "../lib/ids.js"
import {
  buildAppliedMutationOutput,
  buildDeniedMutationOutput,
  type WorkspaceMutationToolOutput,
} from "./workspace-mutation-output.js"
import {
  WorkspaceEditService,
  type WorkspaceMutationSummary,
} from "./workspace-edit-service.js"
import { WorkspaceExecutionService } from "./workspace-execution-service.js"
import {
  buildDeniedExecutionOutput,
  type WorkspaceExecutionToolOutput,
} from "./workspace-execution-output.js"
import {
  WorkspaceError,
  WorkspaceService,
  type WorkspaceHandle,
} from "./workspace-service.js"
import { setTextPart } from "../runtime/run-message-adapters.js"

type ApprovalDecision = "approve" | "deny"

type ApprovalMetadata =
  | { status: "approved" | "denied"; editId: string }
  | { status: "approved" | "denied"; executionId: string }

type ApprovalResolution = {
  action: WorkspaceEditRecord | WorkspaceExecutionRecord
  output: WorkspaceMutationToolOutput | WorkspaceExecutionToolOutput
  toolName: string
  toolInput: Record<string, unknown>
  approval: ApprovalMetadata
  assistantText: string
}

function approvalStatus(
  decision: ApprovalDecision
): ApprovalMetadata["status"] {
  return decision === "approve" ? "approved" : "denied"
}

export class WorkspaceToolApprovalCoordinator {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly editService: WorkspaceEditService,
    private readonly executionService: WorkspaceExecutionService
  ) {}

  async decide(runId: string, toolCallId: string, decision: ApprovalDecision) {
    const run = this.repos.runs.getById(runId)
    if (!run) throw new WorkspaceError("run_not_found", "Run not found.")
    const thread = this.repos.threads.getById(run.threadId)
    if (!thread)
      throw new WorkspaceError("thread_not_found", "Thread not found.")
    if (!thread.workspaceId) {
      throw new WorkspaceError(
        "workspace_not_found",
        "Thread does not have a workspace."
      )
    }

    const handle = await new WorkspaceService(
      this.repos,
      this.config
    ).openWorkspace(thread.workspaceId)

    const resolution = await this.resolveDecision(
      handle,
      runId,
      toolCallId,
      decision
    )

    const step = this.repos.steps.listByRunId(runId).find((item) => {
      const payload = item.payload as Record<string, unknown> | null | undefined
      return payload?.toolCallId === toolCallId
    })
    if (step) {
      this.repos.steps.update(step.id, {
        status: decision === "approve" ? "completed" : "failed",
        payload:
          formatNativeToolRunStepPayload({
            toolCallId,
            toolName: resolution.toolName,
            workspaceId: handle.id,
            input: resolution.toolInput,
            output: resolution.output,
            approval: resolution.approval,
          }) ?? undefined,
      })
    }

    const messages = this.repos.messages.listByThreadId(run.threadId)
    const assistant = messages.find((message) =>
      message.parts.some(
        (part) =>
          (part.type === "tool-call" || part.type === "tool-result") &&
          part.toolCallId === toolCallId
      )
    )
    if (assistant) {
      const parts = setTextPart(
        assistant.parts.map((part) =>
          part.type === "tool-result" && part.toolCallId === toolCallId
            ? { ...part, output: resolution.output }
            : part
        ),
        resolution.assistantText
      )
      this.repos.messages.updatePartsAndStatus(assistant.id, parts, "completed")
    }

    if (!this.hasPendingWorkspaceApprovals(runId)) {
      this.repos.runs.updateStatus(runId, "completed", { finishedAt: nowIso() })
      this.repos.steps.create({
        runId,
        type: "completed",
        status: "completed",
        title: "Completed",
      })
      evaluateCompletedRun(this.repos, runId)
      this.repos.threads.touch(run.threadId, { status: "active" })
    }

    return { action: resolution.action, output: resolution.output }
  }

  private hasPendingWorkspaceApprovals(runId: string): boolean {
    return Boolean(
      this.repos.workspaceEdits.getPendingByRunId(runId) ||
        this.repos.workspaceExecutions.getPendingByRunId(runId)
    )
  }

  private async resolveDecision(
    handle: WorkspaceHandle,
    runId: string,
    toolCallId: string,
    decision: ApprovalDecision
  ): Promise<ApprovalResolution> {
    const execution = this.repos.workspaceExecutions.getByRunAndToolCall(
      runId,
      toolCallId
    )
    if (execution) {
      return this.resolveExecutionDecision(handle, runId, toolCallId, decision)
    }
    return this.resolveEditDecision(handle, runId, toolCallId, decision)
  }

  private async resolveExecutionDecision(
    handle: WorkspaceHandle,
    runId: string,
    toolCallId: string,
    decision: ApprovalDecision
  ): Promise<ApprovalResolution> {
    const result =
      decision === "approve"
        ? await this.executionService.approveByRunToolCall(
            handle,
            runId,
            toolCallId
          )
        : {
            executionId: this.executionService.denyByRunToolCall(
              runId,
              toolCallId
            ).id,
          }
    const execution = this.repos.workspaceExecutions.getById(result.executionId)
    if (!execution) {
      throw new WorkspaceError(
        "workspace_execution_not_found",
        "Workspace execution not found."
      )
    }

    return {
      action: execution,
      output:
        decision === "approve" && "output" in result
          ? result.output
          : buildDeniedExecutionOutput({
              workspaceId: handle.id,
              executionId: result.executionId,
              kind: execution.kind,
            }),
      toolName: execution.toolName,
      toolInput: execution.input,
      approval: {
        status: approvalStatus(decision),
        executionId: execution.id,
      },
      assistantText:
        decision === "approve"
          ? "Workspace action approved and executed."
          : "Workspace action denied. No command was run.",
    }
  }

  private async resolveEditDecision(
    handle: WorkspaceHandle,
    runId: string,
    toolCallId: string,
    decision: ApprovalDecision
  ): Promise<ApprovalResolution> {
    const result =
      decision === "approve"
        ? await this.editService.approveByRunToolCall(handle, runId, toolCallId)
        : { editId: this.editService.denyByRunToolCall(runId, toolCallId).id }
    const edit = this.repos.workspaceEdits.getById(result.editId)
    if (!edit) {
      throw new WorkspaceError(
        "workspace_edit_not_found",
        "Workspace edit not found."
      )
    }

    return {
      action: edit,
      output:
        decision === "approve" && "summary" in result
          ? buildAppliedMutationOutput({
              workspaceId: handle.id,
              editId: result.editId,
              summary: result.summary as WorkspaceMutationSummary,
            })
          : buildDeniedMutationOutput({
              workspaceId: handle.id,
              editId: result.editId,
              path: edit.path,
              operation: edit.operation,
            }),
      toolName: edit.toolName,
      toolInput: edit.input,
      approval: {
        status: approvalStatus(decision),
        editId: edit.id,
      },
      assistantText:
        decision === "approve"
          ? "Workspace edit approved and applied."
          : "Workspace edit denied. No file was changed.",
    }
  }
}
