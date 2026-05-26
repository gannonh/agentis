import {
  agentToolGrantInputListSchema,
  proposedToolGrantSchema,
  unsupportedSourceStepSchema,
  type AgentPromotionDraft,
  type AgentToolGrantInput,
  type ProposedToolGrant,
  type UnsupportedSourceStep,
  type UpdateAgentPromotionDraftRequest,
} from "@workspace/shared"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import type { AppDatabase } from "../db/client.js"
import { agentPromotionDrafts } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type DraftRow = typeof agentPromotionDrafts.$inferSelect

type CreateAgentPromotionDraftInput = {
  threadId: string
  sourceThreadTitle: string
  name: string
  description?: string | null
  systemPrompt: string
  model: string
  toolGrants: AgentToolGrantInput[]
  proposedToolGrants?: ProposedToolGrant[]
  unsupportedSourceSteps?: UnsupportedSourceStep[]
}

function parseToolGrants(raw: string): AgentToolGrantInput[] {
  return agentToolGrantInputListSchema.parse(JSON.parse(raw))
}

function parseProposedToolGrants(raw: string): ProposedToolGrant[] {
  return z.array(proposedToolGrantSchema).parse(JSON.parse(raw))
}

function parseUnsupportedSourceSteps(raw: string): UnsupportedSourceStep[] {
  return z.array(unsupportedSourceStepSchema).parse(JSON.parse(raw))
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

function nextProposedToolGrantsJson(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): string {
  const grants = input.proposedToolGrants ?? existing.proposedToolGrants
  return JSON.stringify(grants)
}

function nextUnsupportedSourceStepsJson(
  input: UpdateAgentPromotionDraftRequest,
  existing: AgentPromotionDraft
): string {
  const steps = input.unsupportedSourceSteps ?? existing.unsupportedSourceSteps
  return JSON.stringify(steps)
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
        proposedToolGrantsJson: nextProposedToolGrantsJson(input, existing),
        unsupportedSourceStepsJson: nextUnsupportedSourceStepsJson(
          input,
          existing
        ),
        updatedAt: nowIso(),
      })
      .where(eq(agentPromotionDrafts.id, id))
      .run()

    return this.getById(id)
  }
}
