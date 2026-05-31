import { createHash } from "node:crypto"
import { readFile, readdir, realpath, stat } from "node:fs/promises"
import path from "node:path"

export type WorkspaceFileSnapshotEntry = {
  path: string
  size: number
  mtimeMs: number
  contentHash?: string
}

export type WorkspaceFileSnapshot = {
  files: Map<string, WorkspaceFileSnapshotEntry>
  truncated: boolean
}

export type WorkspaceChangedFile = {
  path: string
  operation: "created" | "modified" | "deleted"
}

type CaptureOptions = {
  maxFiles: number
  maxFileBytes: number
}

function isInsidePath(childPath: string, parentPath: string) {
  const relativePath = path.relative(parentPath, childPath)
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  )
}

function toWorkspacePath(absolutePath: string, filesRoot: string) {
  return path.relative(filesRoot, absolutePath).split(path.sep).join("/")
}

function hashContent(content: Buffer) {
  return createHash("sha256").update(content).digest("hex")
}

export async function captureWorkspaceFileSnapshot(
  filesRoot: string,
  options: CaptureOptions
): Promise<WorkspaceFileSnapshot> {
  const filesRootRealPath = await realpath(filesRoot)
  const files = new Map<string, WorkspaceFileSnapshotEntry>()
  let truncated = false

  const visit = async (directory: string) => {
    if (truncated) return
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (truncated) return
      const absolutePath = path.join(directory, entry.name)
      const resolvedPath = await realpath(absolutePath).catch((error) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error.code === "ENOENT" || error.code === "ELOOP")
        ) {
          return null
        }
        throw error
      })
      if (!resolvedPath) continue
      if (!isInsidePath(resolvedPath, filesRootRealPath)) continue
      if (entry.isDirectory()) {
        await visit(absolutePath)
        continue
      }
      if (!entry.isFile()) continue
      const fileStat = await stat(absolutePath)
      const workspacePath = toWorkspacePath(absolutePath, filesRootRealPath)
      const contentHash =
        fileStat.size <= options.maxFileBytes
          ? hashContent(await readFile(absolutePath))
          : undefined
      files.set(workspacePath, {
        path: workspacePath,
        size: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
        contentHash,
      })
      if (files.size >= options.maxFiles) {
        truncated = true
      }
    }
  }

  await visit(filesRootRealPath)
  return { files, truncated }
}

function changed(
  before: WorkspaceFileSnapshotEntry,
  after: WorkspaceFileSnapshotEntry
) {
  if (before.contentHash && after.contentHash) {
    return before.contentHash !== after.contentHash
  }
  return before.size !== after.size || before.mtimeMs !== after.mtimeMs
}

export function diffWorkspaceFileSnapshots(
  before: WorkspaceFileSnapshot,
  after: WorkspaceFileSnapshot,
  limit: number
): WorkspaceChangedFile[] {
  const paths = [...new Set([...before.files.keys(), ...after.files.keys()])].sort(
    (a, b) => a.localeCompare(b)
  )
  const changes: WorkspaceChangedFile[] = []
  for (const filePath of paths) {
    if (changes.length >= limit) break
    const beforeEntry = before.files.get(filePath)
    const afterEntry = after.files.get(filePath)
    if (!beforeEntry && afterEntry) {
      changes.push({ path: filePath, operation: "created" })
    } else if (beforeEntry && !afterEntry) {
      changes.push({ path: filePath, operation: "deleted" })
    } else if (beforeEntry && afterEntry && changed(beforeEntry, afterEntry)) {
      changes.push({ path: filePath, operation: "modified" })
    }
  }
  return changes
}
