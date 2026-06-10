import { asc, count, desc, eq } from "drizzle-orm"
import {
  rubricCriterionSchema,
  type CreateLearningRubricRequest,
  type LearningRubric,
  type RubricCriterion,
  type UpdateLearningRubricRequest,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { rubrics } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapLearningRubric } from "../lib/mappers.js"

function parseCriteriaJson(value: string): RubricCriterion[] {
  const parsed = JSON.parse(value) as unknown
  return rubricCriterionSchema.array().parse(parsed)
}

function serializeCriteria(criteria: RubricCriterion[]): string {
  return JSON.stringify(rubricCriterionSchema.array().parse(criteria))
}

function normalizeCriteria(
  criteria: CreateLearningRubricRequest["criteria"]
): RubricCriterion[] {
  return criteria.map((criterion) =>
    rubricCriterionSchema.parse({
      id: criterion.id ?? createId("rubric_criterion"),
      name: criterion.name,
      description: criterion.description?.trim() ? criterion.description : null,
      weight: criterion.weight,
    })
  )
}

export class RubricRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: CreateLearningRubricRequest): LearningRubric {
    const now = nowIso()
    const row = {
      id: createId("rubric"),
      name: input.name,
      description: input.description?.trim() ? input.description : null,
      criteriaJson: serializeCriteria(normalizeCriteria(input.criteria)),
      agentId: input.agentId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(rubrics).values(row).run()
    return mapLearningRubric(row)
  }

  getById(id: string): LearningRubric | null {
    const row = this.db.select().from(rubrics).where(eq(rubrics.id, id)).get()
    return row ? mapLearningRubric(row) : null
  }

  getPrimaryForAgent(agentId: string): LearningRubric | null {
    const row = this.db
      .select()
      .from(rubrics)
      .where(eq(rubrics.agentId, agentId))
      .orderBy(desc(rubrics.updatedAt), asc(rubrics.name), asc(rubrics.id))
      .get()
    return row ? mapLearningRubric(row) : null
  }

  update(id: string, input: UpdateLearningRubricRequest): LearningRubric | null {
    const existing = this.getById(id)
    if (!existing) return null

    const nextCriteria = input.criteria
      ? normalizeCriteria(input.criteria)
      : existing.criteria
    const nextDescription =
      input.description !== undefined
        ? input.description?.trim()
          ? input.description
          : null
        : existing.description

    this.db
      .update(rubrics)
      .set({
        name: input.name ?? existing.name,
        description: nextDescription,
        criteriaJson: serializeCriteria(nextCriteria),
        agentId: input.agentId !== undefined ? input.agentId : existing.agentId,
        updatedAt: nowIso(),
      })
      .where(eq(rubrics.id, id))
      .run()

    return this.getById(id)
  }

  delete(id: string): boolean {
    const result = this.db.delete(rubrics).where(eq(rubrics.id, id)).run()
    return result.changes > 0
  }

  count(): number {
    const row = this.db.select({ value: count() }).from(rubrics).get()
    return Number(row?.value ?? 0)
  }

  countForAgent(agentId: string): number {
    const row = this.db
      .select({ value: count() })
      .from(rubrics)
      .where(eq(rubrics.agentId, agentId))
      .get()
    return Number(row?.value ?? 0)
  }

  listPaginated(input: { page: number; pageSize: number; agentId?: string }) {
    const whereClause = input.agentId
      ? eq(rubrics.agentId, input.agentId)
      : undefined
    const totalCount = whereClause
      ? this.countForAgent(input.agentId!)
      : this.count()
    const totalPages =
      totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize)
    const offset = (input.page - 1) * input.pageSize

    const query = this.db
      .select()
      .from(rubrics)
      .orderBy(asc(rubrics.name), asc(rubrics.id))
      .limit(input.pageSize)
      .offset(offset)

    const rows = (whereClause ? query.where(whereClause) : query).all()

    return {
      rubrics: rows.map(mapLearningRubric),
      page: input.page,
      pageSize: input.pageSize,
      totalCount,
      totalPages,
    }
  }

  listCriteriaById(id: string): RubricCriterion[] {
    const row = this.db.select().from(rubrics).where(eq(rubrics.id, id)).get()
    return row ? parseCriteriaJson(row.criteriaJson) : []
  }

  listByAgentId(agentId: string): LearningRubric[] {
    return this.db
      .select()
      .from(rubrics)
      .where(eq(rubrics.agentId, agentId))
      .orderBy(desc(rubrics.updatedAt), asc(rubrics.name), asc(rubrics.id))
      .all()
      .map(mapLearningRubric)
  }
}
