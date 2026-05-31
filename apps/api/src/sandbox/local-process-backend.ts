import { spawn } from "node:child_process"
import type {
  SandboxBackend,
  SandboxExecuteInput,
  SandboxExecuteResult,
} from "./types.js"
import { collectProcessResult } from "./process-result.js"

function buildEnv(
  filesRoot: string,
  extraEnv: Record<string, string> | undefined
): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "",
    HOME: filesRoot,
    LANG: process.env.LANG ?? "C.UTF-8",
    ...extraEnv,
  }
}

export class LocalProcessSandboxBackend implements SandboxBackend {
  execute(
    input: SandboxExecuteInput,
    signal: AbortSignal
  ): Promise<SandboxExecuteResult> {
    const startedAt = Date.now()
    const child =
      input.kind === "command"
        ? spawn(input.command ?? "", {
            cwd: input.cwd,
            env: buildEnv(input.filesRoot, input.env),
            shell: true,
          })
        : spawn(input.argv?.[0] ?? "", input.argv?.slice(1) ?? [], {
            cwd: input.cwd,
            env: buildEnv(input.filesRoot, input.env),
            shell: false,
          })

    return collectProcessResult(child, input, signal, startedAt)
  }
}
