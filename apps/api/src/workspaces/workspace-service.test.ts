import { mkdir, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "../test/setup.js"
import { WorkspaceService } from "./workspace-service.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

async function seedWorkspaceFile(path: string, content: string | Buffer) {
  if (!ctx) throw new Error("Missing test context")
  const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
  const filesRoot = join(ctx.config.storageRoot, workspace.backendRef, "files")
  const absolutePath = join(filesRoot, path)
  await mkdir(join(absolutePath, ".."), { recursive: true })
  await writeFile(absolutePath, content)
  return { workspace, filesRoot, absolutePath }
}

describe("workspace service", () => {
  it("lists, reads, and searches workspace text files", async () => {
    ctx = createTestContext()
    const { workspace } = await seedWorkspaceFile(
      "notes/alpha.md",
      "Alpha launch notes\nSecond line"
    )
    await seedWorkspaceFile("README.md", "Workspace overview")
    const service = new WorkspaceService(ctx.repos, ctx.config)

    const handle = await service.openWorkspace(workspace.id)
    const listing = await handle.list({ path: "", recursive: true })
    const read = await handle.readText({ path: "notes/alpha.md" })
    const search = await handle.search({ query: "launch", path: "notes" })

    expect(listing.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "README.md", type: "file" }),
        expect.objectContaining({ path: "notes", type: "directory" }),
        expect.objectContaining({ path: "notes/alpha.md", type: "file" }),
      ])
    )
    expect(listing.truncated).toBe(false)
    expect(read).toMatchObject({
      path: "notes/alpha.md",
      content: "Alpha launch notes\nSecond line",
      truncated: false,
    })
    expect(search).toMatchObject({
      truncated: false,
      results: [
        expect.objectContaining({
          path: "notes/alpha.md",
          lineNumber: 1,
          snippet: "Alpha launch notes",
        }),
      ],
    })
  })

  it("rejects absolute paths, traversal, and symlink escapes", async () => {
    ctx = createTestContext()
    const { workspace, filesRoot } = await seedWorkspaceFile("safe.md", "safe")
    const outsidePath = join(ctx.config.storageRoot, "outside.md")
    await writeFile(outsidePath, "outside")
    await symlink(outsidePath, join(filesRoot, "escape.md"))
    const service = new WorkspaceService(ctx.repos, ctx.config)
    const handle = await service.openWorkspace(workspace.id)

    await expect(handle.readText({ path: "/etc/passwd" })).rejects.toMatchObject({
      code: "workspace_path_absolute",
    })
    await expect(handle.readText({ path: "../outside.md" })).rejects.toMatchObject({
      code: "workspace_path_traversal",
    })
    await expect(handle.readText({ path: "escape.md" })).rejects.toMatchObject({
      code: "workspace_symlink_escape",
    })
  })

  it("rejects binary files and truncates large text reads", async () => {
    ctx = createTestContext()
    const { workspace } = await seedWorkspaceFile(
      "binary.dat",
      Buffer.from([0, 1, 2, 3])
    )
    await seedWorkspaceFile("large.txt", "abcdefghijklmnopqrstuvwxyz")
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceReadMaxBytes: 10,
    })
    const handle = await service.openWorkspace(workspace.id)

    await expect(handle.readText({ path: "binary.dat" })).rejects.toMatchObject({
      code: "workspace_binary_file",
    })
    await expect(handle.readText({ path: "large.txt" })).resolves.toMatchObject({
      content: "abcdefghij",
      bytesReturned: 10,
      totalBytes: 26,
      truncated: true,
    })
  })
})
