export const NATIVE_WORKSPACE_READ_TOOL_NAMES = [
  "listWorkspaceFiles",
  "readWorkspaceFile",
  "searchWorkspaceFiles",
] as const

export type NativeWorkspaceReadToolName =
  (typeof NATIVE_WORKSPACE_READ_TOOL_NAMES)[number]

export const MUTATING_NATIVE_WORKSPACE_TOOL_NAMES = [
  "createWorkspaceFile",
  "replaceInWorkspaceFile",
  "applyWorkspacePatch",
] as const

export type MutatingNativeWorkspaceToolName =
  (typeof MUTATING_NATIVE_WORKSPACE_TOOL_NAMES)[number]

export const EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES = [
  "runWorkspaceCommand",
] as const

export type ExecutionNativeWorkspaceToolName =
  (typeof EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES)[number]
