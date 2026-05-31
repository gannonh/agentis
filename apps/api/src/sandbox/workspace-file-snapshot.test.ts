import { mkdir, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  captureWorkspaceFileSnapshot,
  diffWorkspaceFileSnapshots,
} from "./workspace-file-snapshot.js"

async function createFilesRoot() {
  const root = join(tmpdir(), `agentis-snapshot-${randomUUID()}`, "files")
  await mkdir(root, { recursive: true })
  return root
}

describe("workspace file snapshots", () => {
  it("detects created modified and deleted workspace files", async () => {
    const filesRoot = await createFilesRoot()
    try {
      await writeFile(join(filesRoot, "existing.txt"), "before")
      await writeFile(join(filesRoot, "remove.txt"), "remove me")
      const before = await captureWorkspaceFileSnapshot(filesRoot, {
        maxFiles: 100,
        maxFileBytes: 1024,
      })

      await writeFile(join(filesRoot, "existing.txt"), "after")
      await writeFile(join(filesRoot, "created.txt"), "new")
      await rm(join(filesRoot, "remove.txt"))
      const after = await captureWorkspaceFileSnapshot(filesRoot, {
        maxFiles: 100,
        maxFileBytes: 1024,
      })

      expect(diffWorkspaceFileSnapshots(before, after, 10)).toEqual([
        { path: "created.txt", operation: "created" },
        { path: "existing.txt", operation: "modified" },
        { path: "remove.txt", operation: "deleted" },
      ])
    } finally {
      await rm(join(filesRoot, ".."), { recursive: true, force: true })
    }
  })

  it("caps changed-file output", async () => {
    const before = { files: new Map(), truncated: false }
    const after = {
      files: new Map([
        ["a.txt", { path: "a.txt", size: 1, mtimeMs: 1, contentHash: "a" }],
        ["b.txt", { path: "b.txt", size: 1, mtimeMs: 1, contentHash: "b" }],
      ]),
      truncated: false,
    }

    expect(diffWorkspaceFileSnapshots(before, after, 1)).toEqual([
      { path: "a.txt", operation: "created" },
    ])
  })

  it("skips dangling symlinks during traversal", async () => {
    const filesRoot = await createFilesRoot()
    try {
      await writeFile(join(filesRoot, "kept.txt"), "ok")
      await symlink(join(filesRoot, "missing.txt"), join(filesRoot, "dangling"))

      const snapshot = await captureWorkspaceFileSnapshot(filesRoot, {
        maxFiles: 100,
        maxFileBytes: 1024,
      })

      expect([...snapshot.files.keys()]).toEqual(["kept.txt"])
    } finally {
      await rm(join(filesRoot, ".."), { recursive: true, force: true })
    }
  })
})
