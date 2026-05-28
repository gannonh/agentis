import { asc, eq, sql } from "drizzle-orm"
import type {
  CreateSavedMemoryRequest,
  MemoriesListResponse,
  SavedMemory,
  SavedMemoryCategoryKey,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { savedMemories, savedMemoryCategories } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapSavedMemory, mapSavedMemoryCategory } from "../lib/mappers.js"

export class SavedMemoryRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateSavedMemoryRequest): SavedMemory {
    const now = nowIso()
    const row = {
      id: createId("memory"),
      content: input.content,
      category: input.category,
      usageGuidance: input.usageGuidance,
      tagsJson: JSON.stringify(input.tags),
      importance: input.importance,
      date: now.slice(0, 10),
      scope: input.scope,
      associatedAgent: input.associatedAgent ?? null,
      source: "user-generated",
      provenance: "created manually by user",
      pinnedToContext: input.pinnedToContext,
      createdAt: now,
      updatedAt: now,
    }

    this.db.insert(savedMemories).values(row).run()
    return mapSavedMemory(row)
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
