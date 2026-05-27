import { asc, eq, sql } from "drizzle-orm"
import type { MemoriesListResponse, SavedMemoryCategoryKey } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { savedMemories, savedMemoryCategories } from "../db/schema.js"
import { mapSavedMemory, mapSavedMemoryCategory } from "../lib/mappers.js"

export class SavedMemoryRepository {
  constructor(private readonly db: AppDatabase) {}

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
