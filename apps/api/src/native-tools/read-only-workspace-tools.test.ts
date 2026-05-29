import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "../test/setup.js"
import { WorkspaceService } from "../workspaces/workspace-service.js"
import {
  buildWorkspaceNativeTools,
  formatNativeToolRunStepPayload,
  isNativeWorkspaceToolName,
} from "./read-only-workspace-tools.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

async function createHandle() {
  if (!ctx) throw new Error("Missing test context")
  const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
  const filesRoot = join(ctx.config.storageRoot, workspace.backendRef, "files")
  await mkdir(filesRoot, { recursive: true })
  await writeFile(join(filesRoot, "notes.md"), "Alpha workspace notes")
  const service = new WorkspaceService(ctx.repos, ctx.config)
  return service.openWorkspace(workspace.id)
}

describe("read-only workspace native tools", () => {
  it("builds executable list, read, and search tools for a workspace", async () => {
    ctx = createTestContext()
    const handle = await createHandle()

    const tools = buildWorkspaceNativeTools(handle)
    const list = await tools.listWorkspaceFiles.execute?.({ path: "" }, {} as never)
    const read = await tools.readWorkspaceFile.execute?.(
      { path: "notes.md" },
      {} as never
    )
    const search = await tools.searchWorkspaceFiles.execute?.(
      { query: "workspace" },
      {} as never
    )

    expect(Object.keys(tools).sort()).toEqual([
      "listWorkspaceFiles",
      "readWorkspaceFile",
      "searchWorkspaceFiles",
    ])
    expect(list).toMatchObject({
      workspaceId: handle.id,
      entries: [expect.objectContaining({ path: "notes.md" })],
    })
    expect(read).toMatchObject({
      workspaceId: handle.id,
      path: "notes.md",
      content: "Alpha workspace notes",
    })
    expect(search).toMatchObject({
      workspaceId: handle.id,
      results: [expect.objectContaining({ path: "notes.md" })],
    })
  })

  it("identifies and formats native workspace tool payloads", () => {
    expect(isNativeWorkspaceToolName("readWorkspaceFile")).toBe(true)
    expect(isNativeWorkspaceToolName("composio_github_star" )).toBe(false)

    expect(
      formatNativeToolRunStepPayload({
        toolName: "readWorkspaceFile",
        workspaceId: "workspace_agentis",
        input: { path: "notes.md" },
        output: { path: "notes.md", content: "Long file content" },
      })
    ).toMatchObject({
      provider: "native",
      toolName: "readWorkspaceFile",
      workspaceId: "workspace_agentis",
      input: { path: "notes.md" },
      output: { path: "notes.md" },
    })
  })
})
