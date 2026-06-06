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

export const NATIVE_WEB_SEARCH_TOOL_NAMES = ["searchWeb"] as const

export type NativeWebSearchToolName =
  (typeof NATIVE_WEB_SEARCH_TOOL_NAMES)[number]

export const NATIVE_STATIC_ARTIFACT_TOOL_NAMES = [
  "createStaticArtifact",
  "editStaticArtifact",
  "findStaticArtifacts",
  "readStaticArtifact",
] as const

export type NativeStaticArtifactToolName =
  (typeof NATIVE_STATIC_ARTIFACT_TOOL_NAMES)[number]

export const NATIVE_NON_WORKSPACE_TOOL_NAMES = [
  ...NATIVE_WEB_SEARCH_TOOL_NAMES,
  ...NATIVE_STATIC_ARTIFACT_TOOL_NAMES,
] as const

export type NativeNonWorkspaceToolName =
  (typeof NATIVE_NON_WORKSPACE_TOOL_NAMES)[number]

export const NATIVE_TOOL_NAMES = [
  ...NATIVE_WORKSPACE_READ_TOOL_NAMES,
  ...MUTATING_NATIVE_WORKSPACE_TOOL_NAMES,
  ...EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES,
  ...NATIVE_NON_WORKSPACE_TOOL_NAMES,
] as const

export type NativeToolName = (typeof NATIVE_TOOL_NAMES)[number]
