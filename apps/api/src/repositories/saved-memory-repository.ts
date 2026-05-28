import { asc, eq, sql } from "drizzle-orm"
import type {
  CreateSavedMemoryRequest,
  MemoriesListResponse,
  SavedMemory,
  SavedMemoryCategoryKey,
  AgentMemorySummary,
  UpdateSavedMemoryRequest,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { savedMemories, savedMemoryCategories } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapSavedMemory, mapSavedMemoryCategory } from "../lib/mappers.js"

function mapMemories(rows: (typeof savedMemories.$inferSelect)[]): SavedMemory[] {
  return rows.map(mapSavedMemory)
}

function getAssociatedAgents(input: {
  scope: "global" | "agent"
  associatedAgent?: string | null
  associatedAgents?: string[]
}): string[] {
  if (input.scope === "global") return []
  const agents = input.associatedAgents?.length
    ? input.associatedAgents
    : input.associatedAgent
      ? [input.associatedAgent]
      : []
  return [...new Set(agents)]
}

export class SavedMemoryRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateSavedMemoryRequest): SavedMemory {
    const now = nowIso()
    const associatedAgents = getAssociatedAgents(input)
    const row = {
      id: createId("memory"),
      content: input.content,
      category: input.category,
      usageGuidance: input.usageGuidance,
      tagsJson: JSON.stringify(input.tags),
      importance: input.importance,
      date: now.slice(0, 10),
      scope: input.scope,
      associatedAgent: associatedAgents[0] ?? null,
      associatedAgentsJson: JSON.stringify(associatedAgents),
      source: "user-generated",
      sourceThreadId: null,
      sourceThreadTitle: null,
      provenance: "created manually by user",
      pinnedToContext: input.pinnedToContext,
      createdAt: now,
      updatedAt: now,
    }

    this.db.insert(savedMemories).values(row).run()
    return mapSavedMemory(row)
  }

  getById(id: string): SavedMemory | null {
    const row = this.db
      .select()
      .from(savedMemories)
      .where(eq(savedMemories.id, id))
      .get()
    return row ? mapSavedMemory(row) : null
  }

  update(id: string, input: UpdateSavedMemoryRequest): SavedMemory | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updatedAt = nowIso()
    const scope = input.scope ?? existing.scope
    const associatedAgents = getAssociatedAgents({
      scope,
      associatedAgent: input.associatedAgent ?? existing.associatedAgent,
      associatedAgents: input.associatedAgents ?? existing.associatedAgents,
    })

    this.db
      .update(savedMemories)
      .set({
        content: input.content ?? existing.content,
        category: input.category ?? existing.category,
        usageGuidance: input.usageGuidance ?? existing.usageGuidance,
        tagsJson: input.tags ? JSON.stringify(input.tags) : JSON.stringify(existing.tags),
        importance: input.importance ?? existing.importance,
        scope,
        associatedAgent: associatedAgents[0] ?? null,
        associatedAgentsJson: JSON.stringify(associatedAgents),
        pinnedToContext: input.pinnedToContext ?? existing.pinnedToContext,
        updatedAt,
      })
      .where(eq(savedMemories.id, id))
      .run()

    return this.getById(id)
  }

  listForAgent(agentId: string): AgentMemorySummary {
    const global = mapMemories(
      this.db
        .select()
        .from(savedMemories)
        .where(eq(savedMemories.scope, "global"))
        .orderBy(asc(savedMemories.date), asc(savedMemories.id))
        .all()
    )
    const agent = mapMemories(
      this.db
        .select()
        .from(savedMemories)
        .where(eq(savedMemories.scope, "agent"))
        .orderBy(asc(savedMemories.date), asc(savedMemories.id))
        .all()
    ).filter((memory) => memory.associatedAgents.includes(agentId))

    return { agent, global }
  }

  listPinnedForAgent(agentId: string): AgentMemorySummary {
    const memories = this.listForAgent(agentId)
    return {
      agent: memories.agent.filter((memory) => memory.pinnedToContext),
      global: memories.global.filter((memory) => memory.pinnedToContext),
    }
  }

  list(category?: SavedMemoryCategoryKey): MemoriesListResponse {
    const memoriesQuery = this.db
      .select()
      .from(savedMemories)
      .orderBy(asc(savedMemories.date), asc(savedMemories.id))

    const memories = (category
      ? memoriesQuery.where(eq(savedMemories.category, category))
      : memoriesQuery
    )
      .all()
      .map(mapSavedMemory)

    const categoryCounts = this.db
      .select({
        category: savedMemories.category,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(savedMemories)
      .groupBy(savedMemories.category)
      .all()

    const countByCategory = new Map<string, number>(
      categoryCounts.map((row) => [row.category, Number(row.count)])
    )

    const categories = this.db
      .select()
      .from(savedMemoryCategories)
      .orderBy(asc(savedMemoryCategories.sortOrder))
      .all()
      .map((savedMemoryCategory) =>
        mapSavedMemoryCategory(
          savedMemoryCategory,
          countByCategory.get(savedMemoryCategory.id) ?? 0
        )
      )

    return { categories, memories }
  }
}
