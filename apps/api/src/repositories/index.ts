import type { AppConfig } from "../config.js"
import type { AppDatabase } from "../db/client.js"
import { IntegrationConnectionRepository } from "./integration-connection-repository.js"
import { IntegrationToolkitRepository } from "./integration-toolkit-repository.js"
import { MessageRepository } from "./message-repository.js"
import { RunRepository } from "./run-repository.js"
import { RunStepRepository } from "./run-step-repository.js"
import { ThreadRepository } from "./thread-repository.js"
import { ToolAccessGrantRepository } from "./tool-access-grant-repository.js"

export function createRepositories(db: AppDatabase, config?: AppConfig) {
  const composioUserId = config?.composioUserId ?? "agentis-local-user"
  return {
    threads: new ThreadRepository(db),
    messages: new MessageRepository(db),
    runs: new RunRepository(db),
    steps: new RunStepRepository(db),
    integrationToolkits: new IntegrationToolkitRepository(db),
    integrationConnections: new IntegrationConnectionRepository(
      db,
      composioUserId
    ),
    toolAccessGrants: new ToolAccessGrantRepository(db),
  }
}

export type Repositories = ReturnType<typeof createRepositories>
