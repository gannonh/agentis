export type SandboxKind = "command" | "script"
export type SandboxBackendType = "local-process" | "local-container"

export type SandboxExecuteInput = {
  workspaceId: string
  filesRoot: string
  kind: SandboxKind
  command?: string
  argv?: string[]
  cwd: string
  timeoutMs: number
  maxStdoutBytes: number
  maxStderrBytes: number
  env?: Record<string, string>
}

export type SandboxExecuteResult = {
  exitCode: number | null
  stdout: string
  stderr: string
  stdoutTruncated: boolean
  stderrTruncated: boolean
  durationMs: number
  timedOut: boolean
  aborted: boolean
}

export interface SandboxBackend {
  execute(
    input: SandboxExecuteInput,
    signal: AbortSignal
  ): Promise<SandboxExecuteResult>
}
