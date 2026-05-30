import { mkdir, open, readdir, realpath, stat } from "node:fs/promises"
import path from "node:path"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import type { Workspace } from "@workspace/shared"

export type WorkspaceEntry = {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  modifiedAt?: string
}

export type WorkspaceListInput = {
  path?: string
  recursive?: boolean
  limit?: number
}

export type WorkspaceListResult = {
  entries: WorkspaceEntry[]
  truncated: boolean
}

export type WorkspaceReadInput = {
  path: string
  maxBytes?: number
}

export type WorkspaceFileRead = {
  path: string
  content: string
  bytesReturned: number
  totalBytes: number
  truncated: boolean
}

export type WorkspaceSearchInput = {
  query: string
  path?: string
  limit?: number
}

export type WorkspaceSearchResult = {
  path: string
  lineNumber: number
  snippet: string
}

export type WorkspaceSearchResults = {
  results: WorkspaceSearchResult[]
  truncated: boolean
}

export class WorkspaceError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "WorkspaceError"
  }
}

function clampLimit(value: number | undefined, fallback: number, max: number) {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(Math.floor(value), max))
}

function toWorkspacePath(absolutePath: string, filesRoot: string) {
  const relativePath = path.relative(filesRoot, absolutePath)
  return relativePath.split(path.sep).join("/")
}

function isInsidePath(childPath: string, parentPath: string) {
  const relativePath = path.relative(parentPath, childPath)
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  )
}

function normalizeWorkspacePath(inputPath: string | undefined): string {
  const rawPath = inputPath?.trim() ?? ""
  if (!rawPath || rawPath === ".") return ""
  if (path.isAbsolute(rawPath) || /^[/\\]|^[A-Za-z]:[/\\]/.test(rawPath)) {
    throw new WorkspaceError(
      "workspace_path_absolute",
      "Workspace paths must be relative."
    )
  }

  const segments = rawPath.split(/[\\/]+/).filter(Boolean)
  if (segments.some((segment) => segment === "..")) {
    throw new WorkspaceError(
      "workspace_path_traversal",
      "Workspace paths cannot contain traversal segments."
    )
  }

  return path.posix.normalize(segments.filter((segment) => segment !== ".").join("/"))
}

function normalizeWorkspaceBackendRef(backendRef: string): string {
  const rawRef = backendRef.trim()
  if (!rawRef || path.isAbsolute(rawRef) || /^[/\\]|^[A-Za-z]:[/\\]/.test(rawRef)) {
    throw new WorkspaceError(
      "workspace_backend_ref_invalid",
      "Workspace backend reference must be relative."
    )
  }

  const normalized = path.normalize(rawRef)
  const segments = normalized.split(/[\\/]+/).filter(Boolean)
  if (segments.some((segment) => segment === "..")) {
    throw new WorkspaceError(
      "workspace_backend_ref_invalid",
      "Workspace backend reference cannot contain traversal segments."
    )
  }
  return normalized
}

function detectBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, BINARY_SAMPLE_BYTES))
  if (sample.includes(0)) return true
  let suspicious = 0
  for (const byte of sample) {
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1
  }
  return sample.length > 0 && suspicious / sample.length > 0.3
}

function boundedSnippet(line: string, query: string, maxChars: number) {
  const trimmed = line.trim()
  if (trimmed.length <= maxChars) return trimmed

  const index = trimmed.toLowerCase().indexOf(query.toLowerCase())
  const start = Math.max(0, index - Math.floor(maxChars / 2))
  return trimmed.slice(start, start + maxChars)
}

const BINARY_SAMPLE_BYTES = 4096

export class WorkspaceHandle {
  readonly id: string
  readonly rootLabel: string
  private readonly filesRoot: string
  private readonly config: AppConfig

  constructor(input: { workspace: Workspace; filesRoot: string; config: AppConfig }) {
    this.id = input.workspace.id
    this.rootLabel = input.workspace.name
    this.filesRoot = input.filesRoot
    this.config = input.config
  }

  async list(input: WorkspaceListInput = {}): Promise<WorkspaceListResult> {
    const root = await this.resolvePath(input.path)
    const rootStat = await stat(root).catch(() => null)
    if (!rootStat) {
      throw new WorkspaceError("workspace_path_not_found", "Workspace path not found.")
    }
    if (!rootStat.isDirectory()) {
      throw new WorkspaceError("workspace_path_not_directory", "Workspace path is not a directory.")
    }

    const limit = clampLimit(
      input.limit,
      this.config.workspaceListLimit,
      this.config.workspaceListLimit
    )
    const entries: WorkspaceEntry[] = []
    let truncated = false

    const filesRootRealPath = await realpath(this.filesRoot)
    const visit = async (directory: string) => {
      if (truncated) return
      const dirents = await readdir(directory, { withFileTypes: true })
      for (const dirent of dirents.sort((a, b) => a.name.localeCompare(b.name))) {
        const absolutePath = path.join(directory, dirent.name)
        const resolvedPath = await realpath(absolutePath)
        if (!isInsidePath(resolvedPath, filesRootRealPath)) {
          throw new WorkspaceError(
            "workspace_symlink_escape",
            "Workspace symlink points outside the workspace."
          )
        }
        const entryStat = await stat(absolutePath)
        const isDirectory = entryStat.isDirectory()
        entries.push({
          name: dirent.name,
          path: toWorkspacePath(absolutePath, filesRootRealPath),
          type: isDirectory ? "directory" : "file",
          size: isDirectory ? undefined : entryStat.size,
          modifiedAt: entryStat.mtime.toISOString(),
        })
        if (entries.length >= limit) {
          truncated = true
          return
        }
        if (input.recursive && isDirectory) {
          await visit(absolutePath)
        }
      }
    }

    await visit(root)
    return { entries, truncated }
  }

  async readText(input: WorkspaceReadInput): Promise<WorkspaceFileRead> {
    const workspacePath = normalizeWorkspacePath(input.path)
    if (!workspacePath) {
      throw new WorkspaceError("workspace_path_required", "Workspace file path is required.")
    }
    const absolutePath = await this.resolvePath(workspacePath)
    const fileStat = await stat(absolutePath).catch(() => null)
    if (!fileStat) {
      throw new WorkspaceError("workspace_path_not_found", "Workspace file not found.")
    }
    if (fileStat.isDirectory()) {
      throw new WorkspaceError("workspace_path_is_directory", "Workspace path is a directory.")
    }

    const maxBytes = clampLimit(
      input.maxBytes,
      this.config.workspaceReadMaxBytes,
      this.config.workspaceReadMaxBytes
    )
    const readLength = Math.min(fileStat.size, maxBytes)
    const fileHandle = await open(absolutePath, "r")
    let returned: Buffer
    try {
      const sampleLength = Math.min(fileStat.size, BINARY_SAMPLE_BYTES)
      const sampleBuffer = Buffer.alloc(sampleLength)
      const sampleRead = await fileHandle.read(sampleBuffer, 0, sampleLength, 0)
      const sample = sampleBuffer.subarray(0, sampleRead.bytesRead)
      if (detectBinary(sample)) {
        throw new WorkspaceError("workspace_binary_file", "Workspace file is binary.")
      }

      if (readLength <= sample.length) {
        returned = sample.subarray(0, readLength)
      } else {
        returned = Buffer.alloc(readLength)
        sample.copy(returned, 0, 0, sample.length)
        const remainderRead = await fileHandle.read(
          returned,
          sample.length,
          readLength - sample.length,
          sample.length
        )
        returned = returned.subarray(0, sample.length + remainderRead.bytesRead)
      }
    } finally {
      await fileHandle.close()
    }

    const content = returned.toString("utf8")
    return {
      path: workspacePath,
      content,
      bytesReturned: returned.length,
      totalBytes: fileStat.size,
      truncated: fileStat.size > returned.length,
    }
  }

  async search(input: WorkspaceSearchInput): Promise<WorkspaceSearchResults> {
    const query = input.query.trim()
    if (!query) {
      throw new WorkspaceError("workspace_search_query_required", "Search query is required.")
    }

    const limit = clampLimit(
      input.limit,
      this.config.workspaceSearchLimit,
      this.config.workspaceSearchLimit
    )
    const listing = await this.list({
      path: input.path,
      recursive: true,
      limit: this.config.workspaceListLimit,
    })
    const results: WorkspaceSearchResult[] = []
    let truncated = listing.truncated

    for (const entry of listing.entries) {
      if (entry.type !== "file") continue
      let read: WorkspaceFileRead
      try {
        read = await this.readText({ path: entry.path })
      } catch (error) {
        if (error instanceof WorkspaceError && error.code === "workspace_binary_file") {
          continue
        }
        throw error
      }
      if (read.truncated) {
        truncated = true
      }

      const lines = read.content.split(/\r?\n/)
      for (const [index, line] of lines.entries()) {
        if (!line.toLowerCase().includes(query.toLowerCase())) continue
        results.push({
          path: entry.path,
          lineNumber: index + 1,
          snippet: boundedSnippet(
            line,
            query,
            this.config.workspaceSearchSnippetChars
          ),
        })
        if (results.length >= limit) {
          truncated = true
          return { results, truncated }
        }
      }
    }

    return { results, truncated }
  }

  private async resolvePath(inputPath: string | undefined): Promise<string> {
    const workspacePath = normalizeWorkspacePath(inputPath)
    const filesRootRealPath = await realpath(this.filesRoot)
    const candidate = path.resolve(filesRootRealPath, workspacePath)
    if (!isInsidePath(candidate, filesRootRealPath)) {
      throw new WorkspaceError(
        "workspace_path_traversal",
        "Workspace path resolves outside the workspace."
      )
    }

    const resolvedPath = await realpath(candidate).catch(() => candidate)
    if (!isInsidePath(resolvedPath, filesRootRealPath)) {
      throw new WorkspaceError(
        "workspace_symlink_escape",
        "Workspace symlink points outside the workspace."
      )
    }
    return candidate
  }
}

export class WorkspaceService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {}

  async openWorkspace(workspaceId: string): Promise<WorkspaceHandle> {
    const workspace = this.repos.workspaces.getById(workspaceId)
    if (!workspace) {
      throw new WorkspaceError("workspace_not_found", "Workspace not found.")
    }
    if (workspace.status !== "active") {
      throw new WorkspaceError("workspace_archived", "Workspace is archived.")
    }
    if (workspace.backendType !== "local-fs") {
      throw new WorkspaceError(
        "workspace_backend_unsupported",
        "Workspace backend is not supported."
      )
    }

    const storageRoot = path.resolve(this.config.storageRoot)
    const backendRef = normalizeWorkspaceBackendRef(workspace.backendRef)
    const workspaceRoot = path.resolve(storageRoot, backendRef)
    if (!isInsidePath(workspaceRoot, storageRoot)) {
      throw new WorkspaceError(
        "workspace_backend_ref_invalid",
        "Workspace root resolves outside the storage root."
      )
    }
    const filesRoot = path.join(workspaceRoot, "files")
    await mkdir(filesRoot, { recursive: true })
    await mkdir(path.join(workspaceRoot, "artifacts"), { recursive: true })
    await mkdir(path.join(workspaceRoot, "runtime"), { recursive: true })

    return new WorkspaceHandle({ workspace, filesRoot, config: this.config })
  }

  async resolveForThread(threadId: string): Promise<WorkspaceHandle> {
    const thread = this.repos.threads.getById(threadId)
    if (!thread) {
      throw new WorkspaceError("thread_not_found", "Thread not found.")
    }
    if (!thread.workspaceId) {
      throw new WorkspaceError(
        "workspace_not_found",
        "Thread does not have a workspace."
      )
    }
    return this.openWorkspace(thread.workspaceId)
  }
}
