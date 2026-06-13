import { asc, eq, inArray } from "drizzle-orm"
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
    return this.listByThreadIds([threadId]).get(threadId) ?? []
  }

  listByThreadIds(threadIds: string[]): Map<string, Message[]> {
    if (threadIds.length === 0) return new Map()

    const grouped = new Map<string, Message[]>()
    const rows = this.db
      .select()
      .from(messages)
      .where(inArray(messages.threadId, threadIds))
      .orderBy(asc(messages.createdAt))
      .all()

    for (const row of rows) {
      const message = mapMessage(row)
      const threadMessages = grouped.get(message.threadId)
      if (threadMessages) {
        threadMessages.push(message)
      } else {
        grouped.set(message.threadId, [message])
      }
    }

    return grouped
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
