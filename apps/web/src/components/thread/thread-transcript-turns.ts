import type { Message } from "@workspace/shared"
import { messageHasVisibleContent } from "@/lib/thread/message-text"

export type ThreadTurn = {
  id: string
  user: Message | null
  replies: Message[]
}

export function isTranscriptMessage(message: Message) {
  return message.status !== "completed" || messageHasVisibleContent(message)
}

export function groupThreadTurns(messages: Message[]): ThreadTurn[] {
  const turns: ThreadTurn[] = []
  let user: Message | null = null
  let replies: Message[] = []

  for (const message of messages) {
    if (!isTranscriptMessage(message)) continue

    if (message.role === "user") {
      if (user) {
        turns.push({ id: user.id, user, replies })
      }
      user = message
      replies = []
      continue
    }

    if (message.role === "assistant") {
      if (!user) {
        turns.push({ id: message.id, user: null, replies: [message] })
        continue
      }
      replies.push(message)
    }
  }

  if (user) {
    turns.push({ id: user.id, user, replies })
  }

  return turns
}
