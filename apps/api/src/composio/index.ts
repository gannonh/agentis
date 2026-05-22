import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { createComposioClient } from "./composio-client.js"
import { IntegrationService } from "./integration-service.js"
import { ToolExecutionService } from "./tool-execution-service.js"

export function createComposioServices(repos: Repositories, config: AppConfig) {
  const composio = createComposioClient(config)
  return {
    composio,
    integrations: new IntegrationService(repos, config, composio),
    toolExecution: new ToolExecutionService(repos, config, composio),
  }
}

export type ComposioServices = ReturnType<typeof createComposioServices>
export { ComposioRemediationError } from "./tool-execution-service.js"
