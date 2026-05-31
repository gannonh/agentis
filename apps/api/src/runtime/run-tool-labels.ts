import { isNativeWorkspaceToolName } from "../native-tools/native-tool-payload.js"

export function composioToolNameToToolkit(toolName: string): string | undefined {
  if (!toolName.startsWith("composio_")) return undefined
  return toolName.replace(/^composio_/, "").replace(/_/g, "-")
}

export function formatToolStepTitle(input: {
  toolName: string
  toolkitSlug?: string
  curated: boolean
}): string {
  if (input.toolName === "createArtifact") return "Create artifact"
  if (input.toolName === "createWorkspaceFile") return "Create workspace file"
  if (input.toolName === "replaceInWorkspaceFile") return "Replace in workspace file"
  if (input.toolName === "applyWorkspacePatch") return "Apply workspace patch"
  if (isNativeWorkspaceToolName(input.toolName)) {
    return `Native: ${input.toolName}`
  }
  if (input.toolkitSlug && input.curated) {
    return `Composio: ${input.toolkitSlug}`
  }
  return `Tool: ${input.toolName}`
}
