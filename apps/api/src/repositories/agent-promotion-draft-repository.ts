import {
  agentPromotionDraftEditedFieldSchema,
  agentPromotionDraftIntelligenceSchema,
  agentToolGrantInputListSchema,
  type AgentPromotionDraft,
  type AgentToolGrantInput,
  type UpdateAgentPromotionDraftRequest,
} from "@workspace/shared"
import { desc, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { agentPromotionDrafts } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type DraftRow = typeof agentPromotionDrafts.$inferSelect

type DraftIntelligence = AgentPromotionDraft["intelligence"]
type DraftEditedField = AgentPromotionDraft["editedFields"][number]

const editedFieldListSchema = agentPromotionDraftEditedFieldSchema.array()
const editableDraftFields = [
  "name",
  "description",
  "systemPrompt",
  "model",
  "toolGrants",
] as const satisfies readonly DraftEditedField[]
const editableIntelligenceFields = [
  "suggestedPurpose",
  "repeatedSteps",
  "requiredTools",
  "suggestedPrompt",
  "modelRecommendation",
  "rubricCriteria",
] as const satisfies readonly DraftEditedField[]

type CreateAgentPromotionDraftInput = {
  threadId: string
  sourceThreadTitle: string
  name: string
  description?: string | null
  systemPrompt: string
  model: string
  toolGrants: AgentToolGrantInput[]
  intelligence?: DraftIntelligence
  editedFields?: DraftEditedField[]
}

function emptyIntelligence(): DraftIntelligence {
  return {
    repeatedSteps: [],
    requiredTools: [],
    rubricCriteria: [],
  }
}

function parseToolGrants(raw: string): AgentToolGrantInput[] {
  return agentToolGrantInputListSchema.parse(JSON.parse(raw))
}

function parseIntelligence(raw: string): DraftIntelligence {
  return agentPromotionDraftIntelligenceSchema.parse({
    ...emptyIntelligence(),
    ...JSON.parse(raw),
  })
}

function parseEditedFields(raw: string): DraftEditedField[] {
  return editedFieldListSchema.parse(JSON.parse(raw))
}

function mapDraft(row: DraftRow): AgentPromotionDraft {
  return {
    id: row.id,
    threadId: row.threadId,
    sourceThreadTitle: row.sourceThreadTitle,
    name: row.name,
    description: row.description ?? undefined,
    systemPrompt: row.systemPrompt,
    model: row.model,
    toolGrants: parseToolGrants(row.toolGrantsJson),
    intelligence: parseIntelligence(row.intelligenceJson),
    editedFields: parseEditedFields(row.editedFieldsJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function nextDescription(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): string | null {
  if ("description" in input) return input.description ?? null
  return existing.description ?? null
}

function nextToolGrantsJson(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): string {
  const grants = input.toolGrants ?? existing.toolGrants
  return JSON.stringify(grants)
}

function nextIntelligenceJson(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): string {
  return JSON.stringify({
    ...existing.intelligence,
    ...input.intelligence,
  })
}

function changedIntelligenceFields(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): DraftEditedField[] {
  const intelligence = input.intelligence
  if (!intelligence) return []

  return editableIntelligenceFields.filter(
    (field) =>
      field in intelligence &&
      JSON.stringify(intelligence[field]) !==
        JSON.stringify(existing.intelligence[field])
  )
}

function nextEditedFieldsJson(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): string {
  const fields = new Set<DraftEditedField>(existing.editedFields)

  for (const field of editableDraftFields) {
    if (field in input) fields.add(field)
  }
  for (const field of changedIntelligenceFields(input, existing)) {
    fields.add(field)
  }

  return JSON.stringify(Array.from(fields))
}

export class AgentPromotionDraftRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateAgentPromotionDraftInput): AgentPromotionDraft {
    const now = nowIso()
    const row: DraftRow = {
      id: createId("agent_draft"),
      threadId: input.threadId,
      sourceThreadTitle: input.sourceThreadTitle,
      name: input.name,
      description: input.description ?? null,
      systemPrompt: input.systemPrompt,
      model: input.model,
      toolGrantsJson: JSON.stringify(input.toolGrants),
      intelligenceJson: JSON.stringify(input.intelligence ?? emptyIntelligence()),
      editedFieldsJson: JSON.stringify(input.editedFields ?? []),
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(agentPromotionDrafts).values(row).run()
    return mapDraft(row)
  }

  getById(id: string): AgentPromotionDraft | null {
    const row = this.db
      .select()
      .from(agentPromotionDrafts)
      .where(eq(agentPromotionDrafts.id, id))
      .get()
    return row ? mapDraft(row) : null
  }

  getLatestByThreadId(threadId: string): AgentPromotionDraft | null {
    const row = this.db
      .select()
      .from(agentPromotionDrafts)
      .where(eq(agentPromotionDrafts.threadId, threadId))
      .orderBy(
        desc(agentPromotionDrafts.updatedAt),
        desc(agentPromotionDrafts.createdAt)
      )
      .get()
    return row ? mapDraft(row) : null
  }

  update(
    id: string,
    input: UpdateAgentPromotionDraftRequest
  ): AgentPromotionDraft | null {
    const existing = this.getById(id)
    if (!existing) return null

    this.db
      .update(agentPromotionDrafts)
      .set({
        name: input.name ?? existing.name,
        description: nextDescription(input, existing),
        systemPrompt: input.systemPrompt ?? existing.systemPrompt,
        model: input.model ?? existing.model,
        toolGrantsJson: nextToolGrantsJson(input, existing),
        intelligenceJson: nextIntelligenceJson(input, existing),
        editedFieldsJson: nextEditedFieldsJson(input, existing),
        updatedAt: nowIso(),
      })
      .where(eq(agentPromotionDrafts.id, id))
      .run()

    return this.getById(id)
  }
}
