import { asc, eq } from "drizzle-orm"
import type { Message, MessagePart, MessageRole, MessageStatus } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { messages } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapMessage } from "../lib/mappers.js"

export class MessageRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    threadId: string
    role: MessageRole
    parts: MessagePart[]
    status?: MessageStatus
  }): Message {
    const row = {
      id: createId("msg"),
      threadId: input.threadId,
      role: input.role,
      partsJson: JSON.stringify(input.parts),
      status: input.status ?? "completed",
      createdAt: nowIso(),
    }
    this.db.insert(messages).values(row).run()
    return mapMessage(row)
  }

  listByThreadId(threadId: string): Message[] {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt))
      .all()
      .map(mapMessage)
  }

  getById(id: string): Message | null {
    const row = this.db.select().from(messages).where(eq(messages.id, id)).get()
    return row ? mapMessage(row) : null
  }

  updatePartsAndStatus(
    id: string,
    parts: MessagePart[],
    status: MessageStatus
  ): Message | null {
    this.db
      .update(messages)
      .set({
        partsJson: JSON.stringify(parts),
        status,
      })
      .where(eq(messages.id, id))
      .run()
    return this.getById(id)
  }
}
