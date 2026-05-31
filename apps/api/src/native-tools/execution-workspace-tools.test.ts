import { asSchema } from "ai"
import { describe, expect, it } from "vitest"
import {
  parseWorkspaceExecutionInput,
  runWorkspaceCommandInputSchema,
} from "./workspace-execution-schemas.js"

describe("runWorkspaceCommandInputSchema", () => {
  it("serializes to an OpenAI-compatible JSON Schema object", () => {
    const jsonSchema = asSchema(runWorkspaceCommandInputSchema).jsonSchema

    expect(jsonSchema).toEqual(
      expect.objectContaining({
        type: "object",
        properties: expect.objectContaining({
          kind: expect.objectContaining({
            enum: expect.arrayContaining(["command", "script"]),
          }),
        }),
      })
    )
    expect(jsonSchema).not.toHaveProperty("oneOf")
    expect(jsonSchema).not.toHaveProperty("anyOf")
    expect(jsonSchema).not.toHaveProperty("allOf")
    expect(jsonSchema).not.toHaveProperty("enum")
    expect(jsonSchema).not.toHaveProperty("not")
  })

  it("rejects whitespace-only commands and scripts", () => {
    expect(() =>
      parseWorkspaceExecutionInput({ kind: "command", command: "   " })
    ).toThrow("Workspace execution input is invalid.")
    expect(() =>
      parseWorkspaceExecutionInput({
        kind: "script",
        language: "node",
        code: "\n\t",
      })
    ).toThrow("Workspace execution input is invalid.")
  })
})
