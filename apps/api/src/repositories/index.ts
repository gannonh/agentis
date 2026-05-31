import type { AppConfig } from "../config.js"
import type { AppDatabase } from "../db/client.js"
import { AgentPromotionDraftRepository } from "./agent-promotion-draft-repository.js"
import { AgentRepository } from "./agent-repository.js"
import { ArtifactRepository } from "./artifact-repository.js"
import { IntegrationConnectionRepository } from "./integration-connection-repository.js"
import { IntegrationToolkitRepository } from "./integration-toolkit-repository.js"
import { MessageRepository } from "./message-repository.js"
import { ProjectMemoryRepository } from "./project-memory-repository.js"
import { ProjectRepository } from "./project-repository.js"
import { RunRepository } from "./run-repository.js"
import { RunStepRepository } from "./run-step-repository.js"
import { SavedMemoryRepository } from "./saved-memory-repository.js"
import { ThreadRepository } from "./thread-repository.js"
import { ToolAccessGrantRepository } from "./tool-access-grant-repository.js"
import { TestingSeedRepository } from "./testing-seed-repository.js"
import { WorkspaceRepository } from "./workspace-repository.js"
import { WorkspaceEditRepository } from "./workspace-edit-repository.js"
import { WorkspaceExecutionRepository } from "./workspace-execution-repository.js"

export function createRepositories(db: AppDatabase, config?: AppConfig) {
  const composioUserId = config?.composioUserId ?? "agentis-local-user"
  return {
    threads: new ThreadRepository(db),
    messages: new MessageRepository(db),
    runs: new RunRepository(db),
    steps: new RunStepRepository(db),
    projects: new ProjectRepository(db),
    projectMemories: new ProjectMemoryRepository(db),
    savedMemories: new SavedMemoryRepository(db),
    artifacts: new ArtifactRepository(db),
    agents: new AgentRepository(db),
    workspaces: new WorkspaceRepository(db),
    workspaceEdits: new WorkspaceEditRepository(db),
    workspaceExecutions: new WorkspaceExecutionRepository(db),
    agentPromotionDrafts: new AgentPromotionDraftRepository(db),
    integrationToolkits: new IntegrationToolkitRepository(db),
    integrationConnections: new IntegrationConnectionRepository(
      db,
      composioUserId
    ),
    toolAccessGrants: new ToolAccessGrantRepository(db),
    testingSeeds: new TestingSeedRepository(db, config),
  }
}

export type Repositories = ReturnType<typeof createRepositories>
