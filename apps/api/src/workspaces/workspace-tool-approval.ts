import type { MessagePart } from "@workspace/shared"
import { formatNativeToolRunStepPayload } from "../native-tools/native-tool-payload.js"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
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
import { WorkspaceError, WorkspaceService } from "./workspace-service.js"

function setTextPart(parts: MessagePart[], text: string): MessagePart[] {
  const nonText = parts.filter((part) => part.type !== "text")
  return text ? [{ type: "text", text }, ...nonText] : nonText
}

export class WorkspaceToolApprovalCoordinator {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly editService: WorkspaceEditService
  ) {}

  async decide(
    runId: string,
    toolCallId: string,
    decision: "approve" | "deny"
  ) {
    const run = this.repos.runs.getById(runId)
    if (!run) throw new WorkspaceError("run_not_found", "Run not found.")
    const thread = this.repos.threads.getById(run.threadId)
    if (!thread) throw new WorkspaceError("thread_not_found", "Thread not found.")
    if (!thread.workspaceId) {
      throw new WorkspaceError("workspace_not_found", "Thread does not have a workspace.")
    }

    const handle = await new WorkspaceService(this.repos, this.config).openWorkspace(
      thread.workspaceId
    )

    const result =
      decision === "approve"
        ? await this.editService.approveByRunToolCall(handle, runId, toolCallId)
        : { editId: this.editService.denyByRunToolCall(runId, toolCallId).id }

    const edit = this.repos.workspaceEdits.getById(result.editId)
    if (!edit) {
      throw new WorkspaceError("workspace_edit_not_found", "Workspace edit not found.")
    }

    const output: WorkspaceMutationToolOutput =
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
          })

    const step = this.repos.steps
      .listByRunId(runId)
      .find((item) => {
        const payload = item.payload as Record<string, unknown> | null | undefined
        return payload?.toolCallId === toolCallId
      })
    if (step) {
      this.repos.steps.update(step.id, {
        status: decision === "approve" ? "completed" : "failed",
        payload:
          formatNativeToolRunStepPayload({
            toolCallId,
            toolName: edit.toolName,
            workspaceId: handle.id,
            input: edit.input,
            output,
            approval:
              decision === "approve"
                ? { status: "approved", editId: result.editId }
                : { status: "denied", editId: result.editId },
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
      const text =
        decision === "approve"
          ? "Workspace edit approved and applied."
          : "Workspace edit denied. No file was changed."
      const parts = setTextPart(
        assistant.parts.map((part) =>
          part.type === "tool-result" && part.toolCallId === toolCallId
            ? { ...part, output }
            : part
        ),
        text
      )
      this.repos.messages.updatePartsAndStatus(assistant.id, parts, "completed")
    }

    this.repos.runs.updateStatus(runId, "completed", { finishedAt: nowIso() })
    this.repos.steps.create({
      runId,
      type: "completed",
      status: "completed",
      title: "Completed",
    })
    this.repos.threads.touch(run.threadId, { status: "active" })

    return { edit, output }
  }
}
