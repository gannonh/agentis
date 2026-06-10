import { asc, count, desc, eq } from "drizzle-orm"
import type {
  CreateLearningSkillRequest,
  LearningSkill,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { skills } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapLearningSkill } from "../lib/mappers.js"

export class SkillRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateLearningSkillRequest): LearningSkill {
    const now = nowIso()
    const row = {
      id: createId("skill"),
      name: input.name,
      description: input.description ?? null,
      pinned: input.pinned ?? false,
      agentId: input.agentId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(skills).values(row).run()
    return mapLearningSkill(row)
  }

  count(): number {
    const row = this.db.select({ value: count() }).from(skills).get()
    return Number(row?.value ?? 0)
  }

  listPaginated(input: { page: number; pageSize: number }) {
    const totalCount = this.count()
    const totalPages =
      totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize)
    const offset = (input.page - 1) * input.pageSize
    const rows = this.db
      .select()
      .from(skills)
      .orderBy(desc(skills.pinned), asc(skills.name), asc(skills.id))
      .limit(input.pageSize)
      .offset(offset)
      .all()

    return {
      skills: rows.map(mapLearningSkill),
      page: input.page,
      pageSize: input.pageSize,
      totalCount,
      totalPages,
    }
  }
}
