import {
  rubricCriterionSchema,
  runEvaluationSchema,
  type Artifact,
  type ArtifactVersion,
  type Document,
  type DocumentVersion,
  type LearningRubric,
  type LearningSkill,
  type LearningSuggestion,
  type Message,
  type MessagePart,
  type Project,
  type ProjectMemory,
  type SavedMemory,
  type SavedMemoryCategory,
  type Run,
  type RunStep,
  type RunUsage,
  type Thread,
  type Workspace,
} from "@workspace/shared"
import type {
  documents,
  documentVersions,
  learningSuggestions,
  messages,
  projectMemories,
  projects,
  rubrics,
  savedMemories,
  savedMemoryCategories,
  runSteps,
  runs,
  skills,
  threads,
  workspaces,
} from "../db/schema.js"
import { mapSourceWorkflowSnapshot } from "./source-workflow-snapshot.js"

type ProjectRow = typeof projects.$inferSelect
type ProjectMemoryRow = typeof projectMemories.$inferSelect
type SavedMemoryRow = typeof savedMemories.$inferSelect
type SavedMemoryCategoryRow = typeof savedMemoryCategories.$inferSelect
type DocumentRow = typeof documents.$inferSelect
type DocumentVersionRow = typeof documentVersions.$inferSelect
type ThreadRow = typeof threads.$inferSelect
type WorkspaceRow = typeof workspaces.$inferSelect
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
    workspaceId: row.workspaceId ?? undefined,
    agentNameSnapshot: row.agentNameSnapshot ?? undefined,
    agentConfigurationVersionId: row.agentConfigurationVersionId ?? undefined,
    ...mapSourceWorkflowSnapshot(row),
    starred: row.starred,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    agentId: row.agentId,
    name: row.name,
    backendType: row.backendType as Workspace["backendType"],
    backendRef: row.backendRef,
    status: row.status as Workspace["status"],
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
  const cost = row.cost ?? undefined
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
    cost,
    costUsd: cost,
    costBreakdown: row.costBreakdownJson
      ? (JSON.parse(row.costBreakdownJson) as Run["costBreakdown"])
      : undefined,
    evaluation: row.evaluationJson
      ? runEvaluationSchema.parse(JSON.parse(row.evaluationJson))
      : undefined,
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

function parseStringArray(json: string | null): string[] {
  if (!json) return []
  try {
    const value = JSON.parse(json)
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

function parseSavedMemoryTags(tagsJson: string): string[] {
  return parseStringArray(tagsJson)
}

function getSavedMemoryAssociatedAgents(row: SavedMemoryRow): string[] {
  const associatedAgents = parseStringArray(row.associatedAgentsJson)
  if (associatedAgents.length > 0) return associatedAgents
  if (row.associatedAgent) return [row.associatedAgent]
  return []
}

export function mapSavedMemory(row: SavedMemoryRow): SavedMemory {
  return {
    id: row.id,
    content: row.content,
    category: row.category as SavedMemory["category"],
    usageGuidance: row.usageGuidance,
    tags: parseSavedMemoryTags(row.tagsJson),
    importance: row.importance as SavedMemory["importance"],
    date: row.date,
    scope: row.scope as SavedMemory["scope"],
    associatedAgent: row.associatedAgent ?? undefined,
    associatedAgents: getSavedMemoryAssociatedAgents(row),
    source: row.source as SavedMemory["source"],
    sourceThreadId: row.sourceThreadId ?? undefined,
    sourceThreadTitle: row.sourceThreadTitle ?? undefined,
    provenance: row.provenance,
    pinnedToContext: row.pinnedToContext,
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

function parseDocumentMetadata(metadataJson: string) {
  try {
    return JSON.parse(metadataJson) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function artifactTypeFor(row: DocumentRow): Artifact["type"] {
  if (row.documentType === "markdown") return "document"
  if (row.documentType === "document") return "document"
  if (row.documentType === "webpage") return "webpage"
  if (row.documentType === "slides") return "slides"
  if (row.documentType === "table") return "table"
  if (row.documentType === "image") return "image"
  if (row.documentType === "video") return "video"
  if (row.documentType === "hyperapp") return "app"
  if (row.documentType === "app") return "app"
  return "other"
}

export function mapArtifact(row: DocumentRow): Artifact {
  return {
    id: row.id,
    type: artifactTypeFor(row),
    title: row.title,
    description: row.description ?? undefined,
    contentFormat: row.contentFormat as Artifact["contentFormat"],
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    previewText: row.previewText ?? undefined,
    metadata: row.metadataJson
      ? parseDocumentMetadata(row.metadataJson)
      : undefined,
    visibilityScope: row.visibilityScope as Artifact["visibilityScope"],
    projectId: row.projectId ?? undefined,
    projectNameSnapshot: row.projectNameSnapshot ?? undefined,
    threadId: row.threadId ?? undefined,
    threadTitleSnapshot: row.threadTitleSnapshot ?? undefined,
    runId: row.runId ?? undefined,
    agentId: row.agentId ?? undefined,
    agentNameSnapshot: row.agentNameSnapshot ?? undefined,
    currentVersionId: row.currentVersionId ?? undefined,
    currentVersion: row.currentVersion ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapDocument(row: DocumentRow): Document {
  return {
    ...mapArtifact(row),
    type: "document",
    contentFormat: "markdown",
  }
}

export function mapArtifactVersion(row: DocumentVersionRow): ArtifactVersion {
  return {
    id: row.id,
    artifactId: row.documentId,
    version: row.version,
    contentHash: row.contentHash,
    contentStorageKey: row.contentStorageKey,
    changeSummary: row.changeSummary ?? undefined,
    createdByRunId: row.createdByRunId ?? undefined,
    createdByThreadId: row.createdByThreadId ?? undefined,
    createdAt: row.createdAt,
  }
}

export function mapDocumentVersion(row: DocumentVersionRow): DocumentVersion {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    contentHash: row.contentHash,
    contentStorageKey: row.contentStorageKey,
    changeSummary: row.changeSummary ?? undefined,
    createdByRunId: row.createdByRunId ?? undefined,
    createdByThreadId: row.createdByThreadId ?? undefined,
    createdAt: row.createdAt,
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

type SkillRow = typeof skills.$inferSelect
type RubricRow = typeof rubrics.$inferSelect

export function mapLearningSkill(row: SkillRow): LearningSkill {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ? row.description : null,
    pinned: row.pinned,
    agentId: row.agentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapLearningRubric(row: RubricRow): LearningRubric {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ? row.description : null,
    criteria: rubricCriterionSchema
      .array()
      .parse(JSON.parse(row.criteriaJson || "[]")),
    agentId: row.agentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

type LearningSuggestionRow = typeof learningSuggestions.$inferSelect

export function mapLearningSuggestion(
  row: LearningSuggestionRow
): LearningSuggestion {
  return {
    id: row.id,
    status: row.status as LearningSuggestion["status"],
    suggestionType: row.suggestionType as LearningSuggestion["suggestionType"],
    title: row.title,
    content: row.content,
    confidence: row.confidence ?? undefined,
    sourceThreadId: row.sourceThreadId ?? undefined,
    sourceThreadTitle: row.sourceThreadTitle ?? undefined,
    agentId: row.agentId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
