import { count, eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { learningSuggestions } from "../db/schema.js"

export class LearningSuggestionRepository {
  constructor(private readonly db: AppDatabase) {}

  countPending(): number {
    const row = this.db
      .select({ value: count() })
      .from(learningSuggestions)
      .where(eq(learningSuggestions.status, "pending"))
      .get()
    return Number(row?.value ?? 0)
  }
}
