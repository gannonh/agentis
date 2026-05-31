import { asSchema } from "ai"
import { describe, expect, it } from "vitest"
import { runWorkspaceCommandInputSchema } from "./workspace-execution-schemas.js"

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
})
