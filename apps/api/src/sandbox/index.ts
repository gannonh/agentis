import type { AppConfig } from "../config.js"
import { WorkspaceError } from "../workspaces/workspace-service.js"
import { LocalContainerSandboxBackend } from "./local-container-backend.js"
import { LocalProcessSandboxBackend } from "./local-process-backend.js"
import type { SandboxBackend } from "./types.js"

export function createSandboxBackend(config: AppConfig): SandboxBackend {
  if (config.sandboxBackend === "local-process") {
    return new LocalProcessSandboxBackend()
  }
  if (config.sandboxBackend === "local-container") {
    return new LocalContainerSandboxBackend(config.sandboxContainerImage)
  }
  throw new WorkspaceError(
    "sandbox_backend_unavailable",
    `Unsupported sandbox backend: ${config.sandboxBackend}`
  )
}
