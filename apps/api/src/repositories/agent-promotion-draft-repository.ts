import {
  agentPromotionDraftToolGrantProposalSchema,
  agentToolGrantInputListSchema,
  unsupportedSourceStepSchema,
  type AgentPromotionDraft,
  type AgentPromotionDraftToolGrantProposal,
  type AgentToolGrantInput,
  type UnsupportedSourceStep,
  type UpdateAgentPromotionDraftRequest,
} from "@workspace/shared"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import type { AppDatabase } from "../db/client.js"
import { agentPromotionDrafts } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type DraftRow = typeof agentPromotionDrafts.$inferSelect

const proposedToolGrantListSchema = z.array(
  agentPromotionDraftToolGrantProposalSchema
)
const unsupportedSourceStepListSchema = z.array(unsupportedSourceStepSchema)

export type StoredAgentPromotionDraft = Omit<
  AgentPromotionDraft,
  "proposedToolGrants" | "unsupportedSourceSteps"
> & {
  proposedToolGrants: AgentPromotionDraftToolGrantProposal[] | null
  unsupportedSourceSteps: UnsupportedSourceStep[] | null
}

type CreateAgentPromotionDraftInput = {
  threadId: string
  sourceThreadTitle: string
  name: string
  description?: string | null
  systemPrompt: string
  model: string
  toolGrants: AgentToolGrantInput[]
  proposedToolGrants?: AgentPromotionDraftToolGrantProposal[]
  unsupportedSourceSteps?: UnsupportedSourceStep[]
}

function parseToolGrants(raw: string): AgentToolGrantInput[] {
  return agentToolGrantInputListSchema.parse(JSON.parse(raw))
}

function parseProposedToolGrants(
  raw: string | null
): AgentPromotionDraftToolGrantProposal[] | null {
  if (raw === null) return null
  return proposedToolGrantListSchema.parse(JSON.parse(raw))
}

function parseUnsupportedSourceSteps(
  raw: string | null
): UnsupportedSourceStep[] | null {
  if (raw === null) return null
  return unsupportedSourceStepListSchema.parse(JSON.parse(raw))
}

function mapDraft(row: DraftRow): StoredAgentPromotionDraft {
  return {
    id: row.id,
    threadId: row.threadId,
    sourceThreadTitle: row.sourceThreadTitle,
    name: row.name,
    description: row.description ?? undefined,
    systemPrompt: row.systemPrompt,
    model: row.model,
    toolGrants: parseToolGrants(row.toolGrantsJson),
    proposedToolGrants: parseProposedToolGrants(row.proposedToolGrantsJson),
    unsupportedSourceSteps: parseUnsupportedSourceSteps(
      row.unsupportedSourceStepsJson
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function nextDescription(
  input: UpdateAgentPromotionDraftRequest,
  existing: StoredAgentPromotionDraft
): string | null {
  if ("description" in input) return input.description ?? null
  return existing.description ?? null
}

function nextJson<T>(inputValue: T[] | undefined, existingValue: T[]): string {
  return JSON.stringify(inputValue ?? existingValue)
}

export class AgentPromotionDraftRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateAgentPromotionDraftInput): StoredAgentPromotionDraft {
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
      proposedToolGrantsJson: JSON.stringify(input.proposedToolGrants ?? []),
      unsupportedSourceStepsJson: JSON.stringify(
        input.unsupportedSourceSteps ?? []
      ),
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(agentPromotionDrafts).values(row).run()
    return mapDraft(row)
  }

  getById(id: string): StoredAgentPromotionDraft | null {
    const row = this.db
      .select()
      .from(agentPromotionDrafts)
      .where(eq(agentPromotionDrafts.id, id))
      .get()
    return row ? mapDraft(row) : null
  }

  getLatestByThreadId(threadId: string): StoredAgentPromotionDraft | null {
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
  ): StoredAgentPromotionDraft | null {
    const existing = this.getById(id)
    if (!existing) return null

    this.db
      .update(agentPromotionDrafts)
      .set({
        name: input.name ?? existing.name,
        description: nextDescription(input, existing),
        systemPrompt: input.systemPrompt ?? existing.systemPrompt,
        model: input.model ?? existing.model,
        toolGrantsJson: nextJson(input.toolGrants, existing.toolGrants),
        updatedAt: nowIso(),
      })
      .where(eq(agentPromotionDrafts.id, id))
      .run()

    return this.getById(id)
  }
}
