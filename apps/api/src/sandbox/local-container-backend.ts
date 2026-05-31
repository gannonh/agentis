import { spawnSync } from "node:child_process"
import path from "node:path"
import type {
  SandboxBackend,
  SandboxExecuteInput,
  SandboxExecuteResult,
} from "./types.js"
import { LocalProcessSandboxBackend } from "./local-process-backend.js"
import { WorkspaceError } from "../workspaces/workspace-service.js"

export class LocalContainerSandboxBackend implements SandboxBackend {
  constructor(private readonly image: string) {}

  async execute(
    input: SandboxExecuteInput,
    signal: AbortSignal
  ): Promise<SandboxExecuteResult> {
    const docker = spawnSync("docker", ["--version"], { encoding: "utf8" })
    if (docker.status !== 0) {
      throw new WorkspaceError(
        "sandbox_backend_unavailable",
        "Docker is not available for local-container sandbox execution."
      )
    }

    const workspaceCwd =
      input.cwd === input.filesRoot
        ? "/workspace"
        : `/workspace/${input.cwd.slice(input.filesRoot.length).replace(/^\/+/, "")}`
    const volumes = [`-v ${JSON.stringify(input.filesRoot)}:/workspace`]
    const command =
      input.kind === "command"
        ? `sh -lc ${JSON.stringify(input.command ?? "")}`
        : this.scriptCommand(input.argv ?? [], volumes)

    return new LocalProcessSandboxBackend().execute(
      {
        ...input,
        kind: "command",
        command: `docker run --rm --network none ${volumes.join(" ")} -w ${JSON.stringify(workspaceCwd)} ${JSON.stringify(this.image)} ${command}`,
        cwd: input.filesRoot,
      },
      signal
    )
  }

  private scriptCommand(argv: string[], volumes: string[]) {
    const [binary, scriptPath, ...rest] = argv
    if (!binary || !scriptPath) {
      throw new WorkspaceError(
        "sandbox_script_required",
        "Container sandbox script execution requires an interpreter and script path."
      )
    }
    const scriptDirectory = path.dirname(scriptPath)
    const scriptName = path.basename(scriptPath)
    volumes.push(`-v ${JSON.stringify(scriptDirectory)}:/runtime-scripts:ro`)
    return [binary, `/runtime-scripts/${scriptName}`, ...rest]
      .map((part) => JSON.stringify(part))
      .join(" ")
  }
}
