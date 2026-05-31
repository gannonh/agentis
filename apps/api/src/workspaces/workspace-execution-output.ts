import type {
  RunWorkspaceCommandInput,
} from "../native-tools/workspace-execution-schemas.js"
import type { WorkspaceChangedFile } from "../sandbox/workspace-file-snapshot.js"
import type { SandboxExecuteResult } from "../sandbox/types.js"

export type WorkspaceExecutionToolOutput = {
  workspaceId: string
  executionId: string
  kind: "command" | "script"
  exitCode: number | null
  durationMs: number
  stdout: string
  stderr: string
  stdoutTruncated: boolean
  stderrTruncated: boolean
  timedOut: boolean
  aborted: boolean
  changedFiles: WorkspaceChangedFile[]
  status?: "pending_approval" | "denied"
}

export function buildPendingExecutionOutput(input: {
  workspaceId: string
  executionId: string
  kind: RunWorkspaceCommandInput["kind"]
}): WorkspaceExecutionToolOutput {
  return {
    workspaceId: input.workspaceId,
    executionId: input.executionId,
    kind: input.kind,
    exitCode: null,
    durationMs: 0,
    stdout: "",
    stderr: "",
    stdoutTruncated: false,
    stderrTruncated: false,
    timedOut: false,
    aborted: false,
    changedFiles: [],
    status: "pending_approval",
  }
}

export function buildDeniedExecutionOutput(input: {
  workspaceId: string
  executionId: string
  kind: RunWorkspaceCommandInput["kind"]
}): WorkspaceExecutionToolOutput {
  return {
    ...buildPendingExecutionOutput(input),
    status: "denied",
  }
}

export function buildAppliedExecutionOutput(input: {
  workspaceId: string
  executionId: string
  kind: RunWorkspaceCommandInput["kind"]
  result: SandboxExecuteResult
  changedFiles: WorkspaceChangedFile[]
}): WorkspaceExecutionToolOutput {
  return {
    workspaceId: input.workspaceId,
    executionId: input.executionId,
    kind: input.kind,
    exitCode: input.result.exitCode,
    durationMs: input.result.durationMs,
    stdout: input.result.stdout,
    stderr: input.result.stderr,
    stdoutTruncated: input.result.stdoutTruncated,
    stderrTruncated: input.result.stderrTruncated,
    timedOut: input.result.timedOut,
    aborted: input.result.aborted,
    changedFiles: input.changedFiles,
  }
}
