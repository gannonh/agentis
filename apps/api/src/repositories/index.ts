import type { AppConfig } from "../config.js"
import type { AppDatabase } from "../db/client.js"
import { AgentPromotionDraftRepository } from "./agent-promotion-draft-repository.js"
import { AgentRepository } from "./agent-repository.js"
import { AgentScheduleRepository } from "./agent-schedule-repository.js"
import { AgentInvocationRunRepository } from "./agent-invocation-run-repository.js"
import { AgentWebhookRepository } from "./agent-webhook-repository.js"
import { AgentWebhookDeliveryRepository } from "./agent-webhook-delivery-repository.js"
import { AppStateRepository } from "../artifact-apps/app-state-repository.js"
import { ArtifactRepository } from "./artifact-repository.js"
import { DocumentRepository } from "./document-repository.js"
import { IntegrationConnectionRepository } from "./integration-connection-repository.js"
import { IntegrationToolkitRepository } from "./integration-toolkit-repository.js"
import { MessageRepository } from "./message-repository.js"
import { ProjectMemoryRepository } from "./project-memory-repository.js"
import { ProjectRepository } from "./project-repository.js"
import { RunRepository } from "./run-repository.js"
import { RunStepRepository } from "./run-step-repository.js"
import { SavedMemoryRepository } from "./saved-memory-repository.js"
import { LearningSuggestionRepository } from "./learning-suggestion-repository.js"
import { RubricRepository } from "./rubric-repository.js"
import { SkillRepository } from "./skill-repository.js"
import { ThreadRepository } from "./thread-repository.js"
import { ToolAccessGrantRepository } from "./tool-access-grant-repository.js"
import { TestingSeedRepository } from "./testing-seed-repository.js"
import { WorkspaceRepository } from "./workspace-repository.js"
import { WorkspaceEditRepository } from "./workspace-edit-repository.js"
import { WorkspaceExecutionRepository } from "./workspace-execution-repository.js"

export function createRepositories(db: AppDatabase, config?: AppConfig) {
  const composioUserId = config?.composioUserId ?? "agentis-local-user"
  const agentWebhookDeliveries = new AgentWebhookDeliveryRepository(db)
  return {
    threads: new ThreadRepository(db),
    messages: new MessageRepository(db),
    runs: new RunRepository(db),
    steps: new RunStepRepository(db),
    projects: new ProjectRepository(db),
    projectMemories: new ProjectMemoryRepository(db),
    savedMemories: new SavedMemoryRepository(db),
    skills: new SkillRepository(db),
    rubrics: new RubricRepository(db),
    learningSuggestions: new LearningSuggestionRepository(db),
    artifacts: new ArtifactRepository(db),
    appState: new AppStateRepository(db),
    documents: new DocumentRepository(db),
    agents: new AgentRepository(db),
    agentSchedules: new AgentScheduleRepository(db),
    agentWebhooks: new AgentWebhookRepository(
      db,
      config?.apiPublicOrigin ?? "http://127.0.0.1:3101",
      agentWebhookDeliveries
    ),
    agentWebhookDeliveries,
    agentInvocationRuns: new AgentInvocationRunRepository(db),
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
