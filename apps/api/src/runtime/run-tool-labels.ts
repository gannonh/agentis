import { isNativeToolName } from "../native-tools/native-tool-payload.js"

export function composioToolNameToToolkit(toolName: string): string | undefined {
  if (!toolName.startsWith("composio_")) return undefined
  return toolName.replace(/^composio_/, "").replace(/_/g, "-")
}

export function formatToolStepTitle(input: {
  toolName: string
  toolkitSlug?: string
  curated: boolean
}): string {
  if (input.toolName === "createDocument") return "Create document"
  if (input.toolName === "findDocuments") return "Find documents"
  if (input.toolName === "readDocument") return "Read document"
  if (input.toolName === "updateDocumentSection") return "Update document section"
  if (input.toolName === "updateDocumentVisibility")
    return "Update document scope"
  if (input.toolName === "appendDocumentSection") return "Append document section"
  if (input.toolName === "createStaticArtifact") return "Create static artifact"
  if (input.toolName === "editStaticArtifact") return "Edit static artifact"
  if (input.toolName === "findStaticArtifacts") return "Find static artifacts"
  if (input.toolName === "readStaticArtifact") return "Read static artifact"
  if (input.toolName === "createWorkspaceFile") return "Create workspace file"
  if (input.toolName === "replaceInWorkspaceFile") return "Replace in workspace file"
  if (input.toolName === "applyWorkspacePatch") return "Apply workspace patch"
  if (isNativeToolName(input.toolName)) {
    return `Native: ${input.toolName}`
  }
  if (input.toolkitSlug && input.curated) {
    return `Composio: ${input.toolkitSlug}`
  }
  return `Tool: ${input.toolName}`
}
