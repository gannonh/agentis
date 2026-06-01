import { createHash } from "node:crypto"
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { applyPatch, parsePatch } from "diff"
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

export type WorkspaceWriteInput = {
  path: string
  content: string
  createOnly?: boolean
}

export type WorkspaceWriteResult = {
  path: string
  operation: "create" | "overwrite"
  bytesWritten: number
  previousBytes?: number
  created: boolean
  contentHashBefore?: string
  contentHashAfter: string
}

export type WorkspaceReplaceInput = {
  path: string
  oldText: string
  newText: string
  replaceAll?: boolean
}

export type WorkspaceReplaceResult = {
  path: string
  operation: "replace"
  replacements: number
  bytesWritten: number
  contentHashBefore: string
  contentHashAfter: string
}

export type WorkspacePatchInput = {
  path: string
  patch: string
}

export type WorkspacePatchResult = {
  path: string
  operation: "patch"
  linesAdded: number
  linesRemoved: number
  bytesWritten: number
  contentHashBefore: string
  contentHashAfter: string
}

export class WorkspaceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown
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

function hashContent(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex")
}

function assertWritablePath(workspacePath: string, config: AppConfig) {
  const segments = workspacePath.split("/").filter(Boolean)
  if (segments.length > 0 && segments[0]!.startsWith(".")) {
    throw new WorkspaceError(
      "workspace_write_denied",
      "Writes to dotfiles at the workspace root are not allowed."
    )
  }
  for (const prefix of config.workspaceWriteDenyPrefixes) {
    const normalized = prefix
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\/+$/, "")
    if (!normalized) continue
    if (
      workspacePath === normalized ||
      workspacePath.startsWith(`${normalized}/`)
    ) {
      throw new WorkspaceError(
        "workspace_write_denied",
        `Writes under ${prefix} are not allowed.`
      )
    }
  }
}

async function assertWritableTarget(
  absolutePath: string,
  filesRootRealPath: string,
  createOnly: boolean
) {
  const existingStat = await stat(absolutePath).catch(() => null)
  if (createOnly && existingStat) {
    throw new WorkspaceError(
      "workspace_file_exists",
      "Workspace file already exists."
    )
  }
  if (existingStat?.isDirectory()) {
    throw new WorkspaceError("workspace_path_is_directory", "Workspace path is a directory.")
  }
  if (existingStat) {
    const resolved = await realpath(absolutePath)
    if (!isInsidePath(resolved, filesRootRealPath)) {
      throw new WorkspaceError(
        "workspace_symlink_escape",
        "Workspace symlink points outside the workspace."
      )
    }
  }
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
  private readonly runtimeRoot: string
  private readonly config: AppConfig

  constructor(input: {
    workspace: Workspace
    filesRoot: string
    runtimeRoot: string
    config: AppConfig
  }) {
    this.id = input.workspace.id
    this.rootLabel = input.workspace.name
    this.filesRoot = input.filesRoot
    this.runtimeRoot = input.runtimeRoot
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

  async writeText(input: WorkspaceWriteInput): Promise<WorkspaceWriteResult> {
    const workspacePath = normalizeWorkspacePath(input.path)
    if (!workspacePath) {
      throw new WorkspaceError("workspace_path_required", "Workspace file path is required.")
    }
    assertWritablePath(workspacePath, this.config)

    const contentBytes = Buffer.byteLength(input.content, "utf8")
    if (contentBytes > this.config.workspaceWriteMaxBytes) {
      throw new WorkspaceError(
        "workspace_write_too_large",
        "Workspace write exceeds the configured byte limit."
      )
    }

    const filesRootRealPath = await realpath(this.filesRoot)
    const absolutePath = await this.resolvePath(workspacePath)
    await assertWritableTarget(
      absolutePath,
      filesRootRealPath,
      input.createOnly ?? false
    )

    const existingStat = await stat(absolutePath).catch(() => null)
    let contentHashBefore: string | undefined
    let previousBytes: number | undefined
    if (existingStat?.isFile()) {
      const existing = await readFile(absolutePath)
      contentHashBefore = hashContent(existing)
      previousBytes = existingStat.size
    }

    const parentDir = path.dirname(absolutePath)
    await mkdir(parentDir, { recursive: true })
    const parentRealPath = await realpath(parentDir)
    if (!isInsidePath(parentRealPath, filesRootRealPath)) {
      throw new WorkspaceError(
        "workspace_symlink_escape",
        "Workspace write parent resolves outside the workspace."
      )
    }
    const tempDir = await mkdtemp(path.join(parentDir, ".agentis-tmp-"))
    try {
      const tempPath = path.join(tempDir, "content")
      await writeFile(tempPath, input.content, { encoding: "utf8", flag: "wx" })
      const tempRealPath = await realpath(tempPath)
      if (!isInsidePath(tempRealPath, filesRootRealPath)) {
        throw new WorkspaceError(
          "workspace_symlink_escape",
          "Workspace write resolved outside the workspace."
        )
      }
      await rename(tempPath, absolutePath)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }

    return {
      path: workspacePath,
      operation: existingStat ? "overwrite" : "create",
      bytesWritten: contentBytes,
      previousBytes,
      created: !existingStat,
      contentHashBefore,
      contentHashAfter: hashContent(input.content),
    }
  }

  async replaceInText(input: WorkspaceReplaceInput): Promise<WorkspaceReplaceResult> {
    const workspacePath = normalizeWorkspacePath(input.path)
    if (!workspacePath) {
      throw new WorkspaceError("workspace_path_required", "Workspace file path is required.")
    }
    assertWritablePath(workspacePath, this.config)

    if (!input.oldText) {
      throw new WorkspaceError(
        "workspace_replace_text_required",
        "Search text is required."
      )
    }

    const read = await this.readText({ path: workspacePath })
    if (read.truncated) {
      throw new WorkspaceError(
        "workspace_file_too_large",
        "Workspace file is too large to modify safely."
      )
    }
    const contentHashBefore = hashContent(read.content)
    const occurrences = read.content.split(input.oldText).length - 1
    if (occurrences === 0) {
      throw new WorkspaceError(
        "workspace_replace_not_found",
        "Search text was not found in the workspace file."
      )
    }
    if (!input.replaceAll && occurrences > 1) {
      throw new WorkspaceError(
        "workspace_replace_ambiguous",
        "Search text matched multiple times. Set replaceAll to true to replace every match."
      )
    }

    const replacements = input.replaceAll ? occurrences : 1
    if (replacements > this.config.workspaceReplaceMaxCount) {
      throw new WorkspaceError(
        "workspace_replace_limit",
        "Replacement count exceeds the configured limit."
      )
    }
    const matchIndex = read.content.indexOf(input.oldText)
    const nextContent = input.replaceAll
      ? read.content.split(input.oldText).join(input.newText)
      : `${read.content.slice(0, matchIndex)}${input.newText}${read.content.slice(matchIndex + input.oldText.length)}`
    const writeResult = await this.writeText({
      path: workspacePath,
      content: nextContent,
    })

    return {
      path: workspacePath,
      operation: "replace",
      replacements,
      bytesWritten: writeResult.bytesWritten,
      contentHashBefore,
      contentHashAfter: writeResult.contentHashAfter,
    }
  }

  async applyUnifiedPatch(input: WorkspacePatchInput): Promise<WorkspacePatchResult> {
    const workspacePath = normalizeWorkspacePath(input.path)
    if (!workspacePath) {
      throw new WorkspaceError("workspace_path_required", "Workspace file path is required.")
    }
    assertWritablePath(workspacePath, this.config)

    const parsed = parsePatch(input.patch)
    if (!parsed || parsed.length === 0) {
      throw new WorkspaceError(
        "workspace_patch_invalid",
        "Patch could not be parsed."
      )
    }
    if (parsed.length > 1) {
      throw new WorkspaceError(
        "workspace_patch_invalid",
        "Patch must target exactly one file."
      )
    }

    const patch = parsed[0]!
    const oldHeader = patch.oldFileName?.replace(/^a\//, "") ?? ""
    const newHeader = patch.newFileName?.replace(/^b\//, "") ?? ""
    const headerPath = newHeader || oldHeader
    if (headerPath && headerPath !== "/dev/null") {
      const normalizedHeader = normalizeWorkspacePath(headerPath)
      if (normalizedHeader !== workspacePath) {
        throw new WorkspaceError(
          "workspace_patch_path_mismatch",
          "Patch file path does not match the requested workspace path."
        )
      }
    }

    const read = await this.readText({ path: workspacePath })
    if (read.truncated) {
      throw new WorkspaceError(
        "workspace_file_too_large",
        "Workspace file is too large to patch safely."
      )
    }
    const contentHashBefore = hashContent(read.content)
    const patched = applyPatch(read.content, patch)
    if (patched === false) {
      throw new WorkspaceError(
        "workspace_patch_failed",
        "Patch could not be applied to the workspace file."
      )
    }

    const linesAdded = patch.hunks.reduce(
      (total, hunk) =>
        total + hunk.lines.filter((line) => line.startsWith("+")).length,
      0
    )
    const linesRemoved = patch.hunks.reduce(
      (total, hunk) =>
        total + hunk.lines.filter((line) => line.startsWith("-")).length,
      0
    )

    const writeResult = await this.writeText({
      path: workspacePath,
      content: patched,
    })

    return {
      path: workspacePath,
      operation: "patch",
      linesAdded,
      linesRemoved,
      bytesWritten: writeResult.bytesWritten,
      contentHashBefore,
      contentHashAfter: writeResult.contentHashAfter,
    }
  }

  async getFilesRootRealPath(): Promise<string> {
    return realpath(this.filesRoot)
  }

  async resolveExecutionCwd(
    inputPath: string | undefined
  ): Promise<{ workspacePath: string; absolutePath: string }> {
    const workspacePath = normalizeWorkspacePath(inputPath)
    const absolutePath = await this.resolvePath(workspacePath)
    const targetStat = await stat(absolutePath).catch(() => null)
    if (!targetStat) {
      throw new WorkspaceError("sandbox_cwd_invalid", "Sandbox cwd was not found.")
    }
    if (!targetStat.isDirectory()) {
      throw new WorkspaceError(
        "sandbox_cwd_invalid",
        "Sandbox cwd must be a directory."
      )
    }
    return { workspacePath, absolutePath }
  }

  async materializeRuntimeScript(input: {
    executionId: string
    language: "python" | "node"
    code: string
  }): Promise<string> {
    const scriptsRoot = path.join(this.runtimeRoot, "scripts")
    await mkdir(scriptsRoot, { recursive: true })
    const extension = input.language === "python" ? "py" : "js"
    const scriptPath = path.join(scriptsRoot, `${input.executionId}.${extension}`)
    await writeFile(scriptPath, input.code, { encoding: "utf8", flag: "wx" })
    return scriptPath
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
    const runtimeRoot = path.join(workspaceRoot, "runtime")
    await mkdir(filesRoot, { recursive: true })
    await mkdir(path.join(workspaceRoot, "documents"), { recursive: true })
    await mkdir(runtimeRoot, { recursive: true })

    return new WorkspaceHandle({
      workspace,
      filesRoot,
      runtimeRoot,
      config: this.config,
    })
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
