import type {
  AgentPromotionDraft,
  AgentToolGrantInput,
  Message,
  Thread,
  UpdateAgentPromotionDraftRequest,
} from "@workspace/shared"
import { desc, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { agentPromotionDrafts } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type DraftRow = typeof agentPromotionDrafts.$inferSelect

type DraftDefaults = {
  name: string
  description: string
  systemPrompt: string
}

function parseToolGrants(raw: string): AgentToolGrantInput[] {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid promotion draft tool grants")
  }

  return parsed.map((grant) => {
    if (typeof grant !== "object" || grant === null) {
      throw new Error("Invalid promotion draft tool grants")
    }

    const candidate = grant as {
      toolkitSlug?: unknown
      connectionId?: unknown
    }
    if (typeof candidate.toolkitSlug !== "string") {
      throw new Error("Invalid promotion draft tool grants")
    }

    return {
      toolkitSlug: candidate.toolkitSlug,
      connectionId:
        typeof candidate.connectionId === "string"
          ? candidate.connectionId
          : undefined,
    }
  })
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function firstUserText(messages: Message[]): string | null {
  const user = messages.find((message) => message.role === "user")
  const text = user?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim()
  return text || null
}

function cleanTitle(title: string): string | null {
  const cleaned = title.trim().replace(/\s+/g, " ")
  return cleaned || null
}

function buildDraftDefaults(thread: Thread, messages: Message[]): DraftDefaults {
  const title = cleanTitle(thread.title)
  const sourceText = firstUserText(messages)

  return {
    name: title ? `${title} Agent` : "New Agent",
    description: buildDescription(title),
    systemPrompt: buildSystemPrompt(sourceText),
  }
}

function buildDescription(title: string | null): string {
  if (!title) return "Promoted from a completed thread."
  return `Promoted from thread: ${title}`
}

function buildSystemPrompt(sourceText: string | null): string {
  if (!sourceText) return "Use the approach from this completed thread."
  return `Use the approach from this completed thread: ${sourceText}`
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

export class AgentPromotionDraftRepository {
  constructor(private readonly db: AppDatabase) {}

  createFromThread(input: {
    thread: Thread
    messages: Message[]
    toolGrants: AgentToolGrantInput[]
  }): AgentPromotionDraft {
    const now = nowIso()
    const defaults = buildDraftDefaults(input.thread, input.messages)
    const row: DraftRow = {
      id: createId("agent_draft"),
      threadId: input.thread.id,
      sourceThreadTitle: input.thread.title,
      name: defaults.name,
      description: defaults.description,
      systemPrompt: defaults.systemPrompt,
      model: input.thread.model,
      toolGrantsJson: JSON.stringify(input.toolGrants),
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
        updatedAt: nowIso(),
      })
      .where(eq(agentPromotionDrafts.id, id))
      .run()

    return this.getById(id)
  }
}
