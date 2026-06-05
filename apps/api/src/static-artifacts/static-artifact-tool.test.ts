import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { StaticArtifactService } from "./static-artifact-service.js"
import { buildStaticArtifactTools } from "./static-artifact-tool.js"

async function executeTool<TInput>(
  tool: unknown,
  input: TInput
): Promise<unknown> {
  const executable = tool as { execute: (input: TInput) => Promise<unknown> }
  return executable.execute(input)
}

describe("static artifact runtime tools", () => {
  it("creates, edits, finds, and emits bounded evidence payloads", async () => {
    const ctx = createTestContext()
    const { thread, run } = ctx.repos.threads.createWithInitialRun({
      title: "Static tools",
      prompt: "Create a static webpage",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const evidence: Array<{ title: string; payload: Record<string, unknown> }> = []
    const tools = buildStaticArtifactTools(
      new StaticArtifactService(ctx.repos, ctx.config),
      {
        runId: run.id,
        threadId: thread.id,
        onEvidence: (title, payload) => evidence.push({ title, payload }),
      }
    )

    const created = await executeTool(tools.createStaticArtifact, {
      title: "Launch page",
      artifactType: "webpage",
      renderMode: "html",
      contentBrief: "Create a launch page.",
      theme: "editorial",
    })
    expect(created).toMatchObject({
      title: "Launch page",
      artifactType: "webpage",
      renderMode: "html",
      version: 1,
      theme: "editorial",
      viewPath: expect.stringMatching(/^\/artifacts\//),
      downloadPath: expect.stringMatching(/^\/api\/artifacts\//),
    })
    expect(JSON.stringify(evidence[0]?.payload)).not.toContain("<html")

    const artifactId = (created as { artifactId: string }).artifactId
    const found = await executeTool(tools.findStaticArtifacts, {
      query: "Launch",
      limit: 5,
    })
    expect(found).toMatchObject({
      items: [expect.objectContaining({ artifactId, title: "Launch page" })],
      resultCount: 1,
      truncated: false,
    })

    const edited = await executeTool(tools.editStaticArtifact, {
      artifactId,
      contentBrief: "Add launch risks.",
      changeSummary: "Added risks",
      theme: "midnight",
    })
    expect(edited).toMatchObject({
      artifactId,
      previousVersion: 1,
      version: 2,
      viewPath: `/artifacts/${artifactId}`,
    })

    expect(evidence.map((entry) => entry.title)).toEqual([
      "Static artifact created: Launch page",
      "Searched static artifacts",
      "Static artifact edited: Launch page",
    ])
    ctx.cleanup()
  })

  it("returns approved error payloads for invalid mode and provider unavailable states", async () => {
    const ctx = createTestContext()
    const { thread, run } = ctx.repos.threads.createWithInitialRun({
      title: "Static tools",
      prompt: "Create a static webpage",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const tools = buildStaticArtifactTools(
      new StaticArtifactService(ctx.repos, ctx.config),
      { runId: run.id, threadId: thread.id }
    )

    await expect(
      executeTool(tools.createStaticArtifact, {
        title: "Visual page",
        artifactType: "webpage",
        renderMode: "polishedImage",
        contentBrief: "Create it.",
      })
    ).resolves.toMatchObject({
      code: "static_artifact_invalid_render_mode",
      error: expect.stringContaining("polishedImage"),
      remediation: expect.any(String),
    })

    await expect(
      executeTool(tools.createStaticArtifact, {
        title: "Visual deck",
        artifactType: "slides",
        renderMode: "polishedImage",
        contentBrief: "Create it.",
      })
    ).resolves.toMatchObject({
      code: "static_artifact_provider_unavailable",
      error: expect.stringContaining("not configured"),
      remediation: expect.any(String),
    })
    ctx.cleanup()
  })
})
