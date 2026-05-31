import { createHash } from "node:crypto"
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { workspaces } from "../db/schema.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import { WorkspaceService } from "./workspace-service.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function hashContent(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex")
}

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

  it("writes, replaces, and patches text inside the workspace jail", async () => {
    ctx = createTestContext()
    const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
    const service = new WorkspaceService(ctx.repos, ctx.config)
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.writeText({ path: "notes/new.md", content: "Alpha\n" })
    ).resolves.toMatchObject({
      path: "notes/new.md",
      operation: "create",
      bytesWritten: 6,
      created: true,
      contentHashAfter: expect.any(String),
    })
    await expect(
      handle.replaceInText({
        path: "notes/new.md",
        oldText: "Alpha",
        newText: "Beta",
      })
    ).resolves.toMatchObject({
      operation: "replace",
      replacements: 1,
      contentHashBefore: expect.any(String),
      contentHashAfter: expect.any(String),
    })
    await expect(
      handle.applyUnifiedPatch({
        path: "notes/new.md",
        patch:
          "--- a/notes/new.md\n+++ b/notes/new.md\n@@ -1 +1 @@\n-Beta\n+Gamma\n",
      })
    ).resolves.toMatchObject({
      operation: "patch",
      linesAdded: 1,
      linesRemoved: 1,
    })

    await expect(
      readFile(join(ctx.config.storageRoot, workspace.backendRef, "files", "notes/new.md"), "utf8")
    ).resolves.toBe("Gamma\n")
  })

  it("rejects unsafe workspace writes", async () => {
    ctx = createTestContext()
    const { workspace, filesRoot } = await seedWorkspaceFile("safe.md", "safe")
    const outsideDir = join(ctx.config.storageRoot, "outside")
    await mkdir(outsideDir, { recursive: true })
    await symlink(outsideDir, join(filesRoot, "escape-dir"))
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceWriteMaxBytes: 4,
    })
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.writeText({ path: "../outside.md", content: "x" })
    ).rejects.toMatchObject({ code: "workspace_path_traversal" })
    await expect(
      handle.writeText({ path: ".env", content: "x" })
    ).rejects.toMatchObject({ code: "workspace_write_denied" })
    await expect(
      handle.writeText({ path: "too-large.md", content: "12345" })
    ).rejects.toMatchObject({ code: "workspace_write_too_large" })
    await expect(
      handle.writeText({ path: "escape-dir/new.md", content: "safe" })
    ).rejects.toMatchObject({ code: "workspace_symlink_escape" })
  })

  it("normalizes trailing slashes in workspace write deny prefixes", async () => {
    ctx = createTestContext()
    const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceWriteDenyPrefixes: ["node_modules/"],
    })
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.writeText({ path: "node_modules/pkg/index.js", content: "x" })
    ).rejects.toMatchObject({ code: "workspace_write_denied" })
  })

  it("writes through unique temp files without following predictable symlinks", async () => {
    ctx = createTestContext()
    const { workspace, absolutePath } = await seedWorkspaceFile("notes.md", "old")
    const outsidePath = join(ctx.config.storageRoot, "outside-target.md")
    await writeFile(outsidePath, "outside")
    await symlink(outsidePath, `${absolutePath}.agentis-tmp-${process.pid}`)
    const service = new WorkspaceService(ctx.repos, ctx.config)
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.writeText({ path: "notes.md", content: "new" })
    ).resolves.toMatchObject({ operation: "overwrite" })
    await expect(readFile(outsidePath, "utf8")).resolves.toBe("outside")
    await expect(readFile(absolutePath, "utf8")).resolves.toBe("new")
  })

  it("treats replacement text literally", async () => {
    ctx = createTestContext()
    const { workspace } = await seedWorkspaceFile("notes.md", "Alpha Beta Gamma")
    const service = new WorkspaceService(ctx.repos, ctx.config)
    const handle = await service.openWorkspace(workspace.id)

    await handle.replaceInText({
      path: "notes.md",
      oldText: "Beta",
      newText: "$& literal",
    })

    await expect(
      readFile(join(ctx.config.storageRoot, workspace.backendRef, "files", "notes.md"), "utf8")
    ).resolves.toBe("Alpha $& literal Gamma")
  })

  it("rejects empty search text before replacing", async () => {
    ctx = createTestContext()
    const { workspace } = await seedWorkspaceFile("notes.md", "Alpha")
    const service = new WorkspaceService(ctx.repos, ctx.config)
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.replaceInText({ path: "notes.md", oldText: "", newText: "x" })
    ).rejects.toMatchObject({ code: "workspace_replace_text_required" })
  })

  it("rejects replace and patch operations on truncated reads", async () => {
    ctx = createTestContext()
    const { workspace, absolutePath } = await seedWorkspaceFile(
      "large.txt",
      `Alpha\n${"x".repeat(100)}tail`
    )
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceReadMaxBytes: 10,
    })
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.replaceInText({ path: "large.txt", oldText: "Alpha", newText: "Beta" })
    ).rejects.toMatchObject({ code: "workspace_file_too_large" })
    await expect(
      handle.applyUnifiedPatch({
        path: "large.txt",
        patch: "--- a/large.txt\n+++ b/large.txt\n@@ -1 +1 @@\n-Alpha\n+Beta\n",
      })
    ).rejects.toMatchObject({ code: "workspace_file_too_large" })
    await expect(readFile(absolutePath, "utf8")).resolves.toContain("tail")
  })

  it("hashes full previous content when overwriting files larger than the read limit", async () => {
    ctx = createTestContext()
    const previous = `${"x".repeat(100)}tail`
    const { workspace } = await seedWorkspaceFile("large.txt", previous)
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceReadMaxBytes: 10,
    })
    const handle = await service.openWorkspace(workspace.id)

    await expect(
      handle.writeText({ path: "large.txt", content: "next" })
    ).resolves.toMatchObject({
      operation: "overwrite",
      previousBytes: Buffer.byteLength(previous),
      contentHashBefore: hashContent(previous),
    })
  })

  it("marks search results truncated when a scanned file exceeds the read limit", async () => {
    ctx = createTestContext()
    const { workspace } = await seedWorkspaceFile(
      "huge.txt",
      `${"x".repeat(100)}\nneedle-after-limit`
    )
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceReadMaxBytes: 10,
      workspaceListLimit: 200,
    })
    const handle = await service.openWorkspace(workspace.id)

    const search = await handle.search({ query: "needle-after-limit" })

    expect(search.results).toEqual([])
    expect(search.truncated).toBe(true)
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

  it("rejects backend refs that escape the storage root", async () => {
    ctx = createTestContext()
    const workspace = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
    ctx.db
      .update(workspaces)
      .set({ backendRef: "../outside" })
      .where(eq(workspaces.id, workspace.id))
      .run()
    const service = new WorkspaceService(ctx.repos, ctx.config)

    await expect(service.openWorkspace(workspace.id)).rejects.toMatchObject({
      code: "workspace_backend_ref_invalid",
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

  it("reads only the configured byte limit from large text files", async () => {
    ctx = createTestContext()
    const { workspace } = await seedWorkspaceFile(
      "huge.txt",
      `${"x".repeat(500_000)}tail`
    )
    const service = new WorkspaceService(ctx.repos, {
      ...ctx.config,
      workspaceReadMaxBytes: 10,
    })
    const handle = await service.openWorkspace(workspace.id)

    await expect(handle.readText({ path: "huge.txt" })).resolves.toMatchObject({
      content: "x".repeat(10),
      bytesReturned: 10,
      totalBytes: 500_004,
      truncated: true,
    })
  })
})
