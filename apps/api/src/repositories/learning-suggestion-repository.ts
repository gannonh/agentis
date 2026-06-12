import { and, asc, count, desc, eq, ne, or } from "drizzle-orm"
import type {
  LearningSuggestion,
  LearningSuggestionStatus,
  LearningSuggestionType,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { learningSuggestions } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapLearningSuggestion } from "../lib/mappers.js"

export type CreateLearningSuggestionInput = {
  suggestionType: LearningSuggestionType
  title: string
  content: string
  confidence?: number
  sourceThreadId?: string | null
  sourceThreadTitle?: string | null
  agentId?: string | null
}

export class LearningSuggestionRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateLearningSuggestionInput): LearningSuggestion {
    const now = nowIso()
    const row = {
      id: createId("learning_suggestion"),
      status: "pending" as const,
      suggestionType: input.suggestionType,
      title: input.title,
      content: input.content,
      confidence: input.confidence ?? null,
      sourceThreadId: input.sourceThreadId ?? null,
      sourceThreadTitle: input.sourceThreadTitle ?? null,
      agentId: input.agentId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(learningSuggestions).values(row).run()
    return mapLearningSuggestion(row)
  }

  getById(id: string): LearningSuggestion | null {
    const row = this.db
      .select()
      .from(learningSuggestions)
      .where(eq(learningSuggestions.id, id))
      .get()
    return row ? mapLearningSuggestion(row) : null
  }

  countPending(): number {
    const row = this.db
      .select({ value: count() })
      .from(learningSuggestions)
      .where(eq(learningSuggestions.status, "pending"))
      .get()
    return Number(row?.value ?? 0)
  }

  hasOpenSuggestionForThreadContent(
    sourceThreadId: string,
    content: string
  ): boolean {
    const row = this.db
      .select({ value: count() })
      .from(learningSuggestions)
      .where(
        and(
          eq(learningSuggestions.sourceThreadId, sourceThreadId),
          eq(learningSuggestions.content, content),
          or(
            eq(learningSuggestions.status, "pending"),
            eq(learningSuggestions.status, "accepted")
          )
        )
      )
      .get()
    return Number(row?.value ?? 0) > 0
  }

  listOtherPendingWithSameThreadContent(
    sourceThreadId: string,
    content: string,
    excludeId: string
  ): LearningSuggestion[] {
    return this.db
      .select()
      .from(learningSuggestions)
      .where(
        and(
          eq(learningSuggestions.sourceThreadId, sourceThreadId),
          eq(learningSuggestions.content, content),
          eq(learningSuggestions.status, "pending"),
          ne(learningSuggestions.id, excludeId)
        )
      )
      .all()
      .map(mapLearningSuggestion)
  }

  listPaginated(input: {
    page: number
    pageSize: number
    status?: LearningSuggestionStatus
    threadId?: string
  }) {
    const filters = []
    if (input.status) {
      filters.push(eq(learningSuggestions.status, input.status))
    }
    if (input.threadId) {
      filters.push(eq(learningSuggestions.sourceThreadId, input.threadId))
    }
    const whereClause =
      filters.length > 0 ? and(...filters) : undefined

    const countQuery = this.db.select({ value: count() }).from(learningSuggestions)
    const totalCount = Number(
      (whereClause ? countQuery.where(whereClause) : countQuery).get()?.value ?? 0
    )
    const totalPages =
      totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize)
    const offset = (input.page - 1) * input.pageSize

    const listQuery = this.db
      .select()
      .from(learningSuggestions)
      .orderBy(desc(learningSuggestions.createdAt), asc(learningSuggestions.id))
      .limit(input.pageSize)
      .offset(offset)

    const rows = (whereClause ? listQuery.where(whereClause) : listQuery).all()

    return {
      suggestions: rows.map(mapLearningSuggestion),
      page: input.page,
      pageSize: input.pageSize,
      totalCount,
      totalPages,
    }
  }

  updateStatus(
    id: string,
    status: LearningSuggestionStatus
  ): LearningSuggestion | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updatedAt = nowIso()
    this.db
      .update(learningSuggestions)
      .set({ status, updatedAt })
      .where(eq(learningSuggestions.id, id))
      .run()

    return this.getById(id)
  }
}
