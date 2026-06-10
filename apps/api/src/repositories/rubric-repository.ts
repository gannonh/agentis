import { asc, count } from "drizzle-orm"
import type { LearningRubric } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { rubrics } from "../db/schema.js"
import { mapLearningRubric } from "../lib/mappers.js"

export class RubricRepository {
  constructor(private readonly db: AppDatabase) {}

  count(): number {
    const row = this.db.select({ value: count() }).from(rubrics).get()
    return Number(row?.value ?? 0)
  }

  listPaginated(input: { page: number; pageSize: number }) {
    const totalCount = this.count()
    const totalPages =
      totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize)
    const offset = (input.page - 1) * input.pageSize
    const rows = this.db
      .select()
      .from(rubrics)
      .orderBy(asc(rubrics.name), asc(rubrics.id))
      .limit(input.pageSize)
      .offset(offset)
      .all()

    return {
      rubrics: rows.map(mapLearningRubric),
      page: input.page,
      pageSize: input.pageSize,
      totalCount,
      totalPages,
    }
  }
}
