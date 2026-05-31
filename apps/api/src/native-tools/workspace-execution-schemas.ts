import { jsonSchema, type JSONSchema7 } from "ai"
import { z } from "zod"
import { WorkspaceError } from "../workspaces/workspace-service.js"

const runWorkspaceCommandParseSchema = z.discriminatedUnion("kind", [
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
  typeof runWorkspaceCommandParseSchema
>

const runWorkspaceCommandJsonSchema: JSONSchema7 = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      enum: ["command", "script"],
      description:
        "Use command for shell commands, or script for short Python/Node programs.",
    },
    command: {
      type: "string",
      minLength: 1,
      description: "Shell command to run when kind is command.",
    },
    language: {
      type: "string",
      enum: ["python", "node"],
      description: "Script language to run when kind is script.",
    },
    code: {
      type: "string",
      minLength: 1,
      description: "Script source code to run when kind is script.",
    },
    cwd: {
      type: "string",
      description:
        "Optional workspace-relative directory to run in. Defaults to the workspace root.",
    },
  },
  required: ["kind"],
  anyOf: [
    {
      properties: { kind: { const: "command" } },
      required: ["kind", "command"],
    },
    {
      properties: { kind: { const: "script" } },
      required: ["kind", "language", "code"],
    },
  ],
}

export const runWorkspaceCommandInputSchema =
  jsonSchema<RunWorkspaceCommandInput>(runWorkspaceCommandJsonSchema, {
    validate: (value) => {
      const parsed = runWorkspaceCommandParseSchema.safeParse(value)
      return parsed.success
        ? { success: true, value: parsed.data }
        : { success: false, error: parsed.error }
    },
  })

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
  const parsed = runWorkspaceCommandParseSchema.safeParse(input)
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
