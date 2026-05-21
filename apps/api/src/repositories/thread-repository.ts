import { desc, eq } from "drizzle-orm"
import type { Thread, ThreadMode, ThreadStatus } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { threads } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapThread } from "../lib/mappers.js"

export class ThreadRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    title: string
    model: string
    mode: ThreadMode
    projectId?: string
  }): Thread {
    const now = nowIso()
    const row = {
      id: createId("thread"),
      title: input.title,
      status: "active" as ThreadStatus,
      model: input.model,
      mode: input.mode,
      projectId: input.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(threads).values(row).run()
    return mapThread(row)
  }

  getById(id: string): Thread | null {
    const row = this.db.select().from(threads).where(eq(threads.id, id)).get()
    return row ? mapThread(row) : null
  }

  list(): Thread[] {
    return this.db
      .select()
      .from(threads)
      .orderBy(desc(threads.updatedAt))
      .all()
      .map(mapThread)
  }

  touch(id: string, patch?: { title?: string; status?: ThreadStatus }) {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(threads)
      .set({
        title: patch?.title ?? existing.title,
        status: patch?.status ?? existing.status,
        updatedAt,
      })
      .where(eq(threads.id, id))
      .run()
    return this.getById(id)
  }
}
