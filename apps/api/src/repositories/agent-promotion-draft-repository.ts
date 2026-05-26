import type { AgentPromotionDraft, AgentToolGrantInput, Message, Thread } from "@workspace/shared"
import { desc, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { agentPromotionDrafts } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

type DraftRow = typeof agentPromotionDrafts.$inferSelect

function parseToolGrants(raw: string): AgentToolGrantInput[] {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid promotion draft tool grants")
  }
  return parsed.map((grant) => {
    if (
      typeof grant !== "object" ||
      grant === null ||
      !("toolkitSlug" in grant) ||
      typeof grant.toolkitSlug !== "string"
    ) {
      throw new Error("Invalid promotion draft tool grants")
    }
    return {
      toolkitSlug: grant.toolkitSlug,
      connectionId:
        "connectionId" in grant && typeof grant.connectionId === "string"
          ? grant.connectionId
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

export class AgentPromotionDraftRepository {
  constructor(private readonly db: AppDatabase) {}

  createFromThread(input: {
    thread: Thread
    messages: Message[]
    toolGrants: AgentToolGrantInput[]
  }): AgentPromotionDraft {
    const now = nowIso()
    const sourceText = firstUserText(input.messages)
    const row: DraftRow = {
      id: createId("agent_draft"),
      threadId: input.thread.id,
      sourceThreadTitle: input.thread.title,
      name: `${input.thread.title} Agent`,
      description: `Promoted from thread: ${input.thread.title}`,
      systemPrompt: sourceText
        ? `Use the approach from this completed thread: ${sourceText}`
        : `Use the approach from the completed thread "${input.thread.title}".`,
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
      .orderBy(desc(agentPromotionDrafts.updatedAt), desc(agentPromotionDrafts.createdAt))
      .get()
    return row ? mapDraft(row) : null
  }
}
