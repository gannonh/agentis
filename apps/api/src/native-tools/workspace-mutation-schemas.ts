import { z } from "zod"
import { WorkspaceError } from "../workspaces/workspace-service.js"
import type { WorkspaceMutationInput } from "../workspaces/workspace-edit-service.js"

export const createWorkspaceFileInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

export const replaceInWorkspaceFileInputSchema = z.object({
  path: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string(),
  replaceAll: z.boolean().optional(),
})

export const applyWorkspacePatchInputSchema = z.object({
  path: z.string().min(1),
  patch: z.string().min(1),
})

function validationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }))
}

export function parseWorkspaceMutationInput(
  toolName: string,
  input: Record<string, unknown>
): WorkspaceMutationInput {
  if (toolName === "createWorkspaceFile") {
    const parsed = createWorkspaceFileInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new WorkspaceError(
        "workspace_mutation_input_invalid",
        "Workspace create input is invalid.",
        validationDetails(parsed.error)
      )
    }
    return { toolName, input: parsed.data }
  }
  if (toolName === "replaceInWorkspaceFile") {
    const parsed = replaceInWorkspaceFileInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new WorkspaceError(
        "workspace_mutation_input_invalid",
        "Workspace replace input is invalid.",
        validationDetails(parsed.error)
      )
    }
    return { toolName, input: parsed.data }
  }
  if (toolName === "applyWorkspacePatch") {
    const parsed = applyWorkspacePatchInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new WorkspaceError(
        "workspace_mutation_input_invalid",
        "Workspace patch input is invalid.",
        validationDetails(parsed.error)
      )
    }
    return { toolName, input: parsed.data }
  }
  throw new WorkspaceError(
    "workspace_mutation_tool_unknown",
    `Unknown workspace mutation tool: ${toolName}`
  )
}

export function operationForMutationTool(
  toolName: WorkspaceMutationInput["toolName"]
) {
  if (toolName === "createWorkspaceFile") return "create"
  if (toolName === "replaceInWorkspaceFile") return "replace"
  return "patch"
}
