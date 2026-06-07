import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { AppService } from "./app-service.js"
import { buildAppTools } from "./app-tool.js"

async function executeTool<TInput>(
  tool: unknown,
  input: TInput
): Promise<unknown> {
  const executable = tool as { execute: (input: TInput) => Promise<unknown> }
  return executable.execute(input)
}

describe("app runtime tools", () => {
  it("emits timeline evidence when createApp fails", async () => {
    const ctx = createTestContext()
    const { thread, run } = ctx.repos.threads.createWithInitialRun({
      title: "App tools",
      prompt: "Create an app",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const evidence: Array<{ title: string; payload: Record<string, unknown> }> = []
    const tools = buildAppTools(new AppService(ctx.repos, ctx.config), {
      runId: run.id,
      threadId: thread.id,
      onEvidence: (title, payload) => evidence.push({ title, payload }),
    })

    const result = await executeTool(tools.createApp, {
      title: "Bad app",
      bundle: {
        html: "<main></main>",
        js: "fetch('https://example.com')",
      },
    })

    expect(result).toMatchObject({
      action: "failed",
      code: "app_invalid_bundle",
    })
    expect(evidence).toEqual([
      {
        title: "App failed",
        payload: {
          action: "failed",
          code: "app_invalid_bundle",
          error: expect.any(String),
          remediation: expect.any(String),
        },
      },
    ])
    ctx.cleanup()
  })
})
