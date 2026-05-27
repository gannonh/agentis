import type {
  Artifact,
  Message,
  MessagePart,
  Project,
  ProjectMemory,
  SavedMemory,
  SavedMemoryCategory,
  Run,
  RunStep,
  RunUsage,
  Thread,
} from "@workspace/shared"
import type {
  artifacts,
  messages,
  projectMemories,
  projects,
  savedMemories,
  savedMemoryCategories,
  runSteps,
  runs,
  threads,
} from "../db/schema.js"
import { mapSourceWorkflowSnapshot } from "./source-workflow-snapshot.js"

type ProjectRow = typeof projects.$inferSelect
type ProjectMemoryRow = typeof projectMemories.$inferSelect
type SavedMemoryRow = typeof savedMemories.$inferSelect
type SavedMemoryCategoryRow = typeof savedMemoryCategories.$inferSelect
type ArtifactRow = typeof artifacts.$inferSelect
type ThreadRow = typeof threads.$inferSelect
type MessageRow = typeof messages.$inferSelect
type RunRow = typeof runs.$inferSelect
type RunStepRow = typeof runSteps.$inferSelect

export function mapThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    title: row.title,
    status: row.status as Thread["status"],
    model: row.model,
    mode: row.mode as Thread["mode"],
    projectId: row.projectId ?? undefined,
    agentId: row.agentId ?? undefined,
    agentNameSnapshot: row.agentNameSnapshot ?? undefined,
    agentConfigurationVersionId: row.agentConfigurationVersionId ?? undefined,
    ...mapSourceWorkflowSnapshot(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role as Message["role"],
    parts: JSON.parse(row.partsJson) as MessagePart[],
    status: row.status as Message["status"],
    createdAt: row.createdAt,
  }
}

export function mapRun(row: RunRow): Run {
  return {
    id: row.id,
    threadId: row.threadId,
    status: row.status as Run["status"],
    model: row.model,
    agentId: row.agentId ?? undefined,
    agentConfigurationVersionId: row.agentConfigurationVersionId ?? undefined,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? undefined,
    errorSummary: row.errorSummary ?? undefined,
    usage: row.usageJson ? (JSON.parse(row.usageJson) as RunUsage) : undefined,
    cost: row.cost ?? undefined,
  }
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    goals: row.goals ?? undefined,
    status: row.status as Project["status"],
    archivedAt: row.archivedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapProjectMemory(row: ProjectMemoryRow): ProjectMemory {
  return {
    id: row.id,
    projectId: row.projectId,
    content: row.content,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapSavedMemory(row: SavedMemoryRow): SavedMemory {
  return {
    id: row.id,
    content: row.content,
    category: row.category as SavedMemory["category"],
    usageGuidance: row.usageGuidance,
    tags: JSON.parse(row.tagsJson) as string[],
    importance: row.importance as SavedMemory["importance"],
    date: row.date,
    scope: row.scope as SavedMemory["scope"],
    associatedAgent: row.associatedAgent ?? undefined,
    source: row.source,
    provenance: row.provenance,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapSavedMemoryCategory(
  row: SavedMemoryCategoryRow,
  count: number
): SavedMemoryCategory {
  return {
    id: row.id as SavedMemoryCategory["id"],
    name: row.name as SavedMemoryCategory["name"],
    description: row.description,
    count,
  }
}

function parseArtifactMetadata(metadataJson: string) {
  try {
    return JSON.parse(metadataJson) as Record<string, unknown>
  } catch {
    return undefined
  }
}

export function mapArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type as Artifact["type"],
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    previewText: row.previewText ?? undefined,
    metadata: row.metadataJson
      ? parseArtifactMetadata(row.metadataJson)
      : undefined,
    projectId: row.projectId ?? undefined,
    projectNameSnapshot: row.projectNameSnapshot ?? undefined,
    threadId: row.threadId ?? undefined,
    threadTitleSnapshot: row.threadTitleSnapshot ?? undefined,
    runId: row.runId ?? undefined,
    agentId: row.agentId ?? undefined,
    agentNameSnapshot: row.agentNameSnapshot ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapRunStep(row: RunStepRow): RunStep {
  return {
    id: row.id,
    runId: row.runId,
    type: row.type as RunStep["type"],
    status: row.status as RunStep["status"],
    title: row.title,
    payload: row.payloadJson
      ? (JSON.parse(row.payloadJson) as Record<string, unknown>)
      : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
