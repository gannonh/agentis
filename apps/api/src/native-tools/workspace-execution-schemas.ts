import { z } from "zod"
import { WorkspaceError } from "../workspaces/workspace-service.js"

export const runWorkspaceCommandInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("command"),
    command: z.string().min(1),
    cwd: z.string().optional(),
  }),
  z.object({
    kind: z.literal("script"),
    language: z.enum(["python", "node"]),
    code: z.string().min(1),
    cwd: z.string().optional(),
  }),
])

export type RunWorkspaceCommandInput = z.infer<
  typeof runWorkspaceCommandInputSchema
>

function validationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }))
}

export function parseWorkspaceExecutionInput(
  input: Record<string, unknown>
): RunWorkspaceCommandInput {
  const parsed = runWorkspaceCommandInputSchema.safeParse(input)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const code =
      firstIssue?.path.includes("command") || input.kind === "command"
        ? "sandbox_command_required"
        : "sandbox_script_required"
    throw new WorkspaceError(
      code,
      "Workspace execution input is invalid.",
      validationDetails(parsed.error)
    )
  }
  return parsed.data
}
