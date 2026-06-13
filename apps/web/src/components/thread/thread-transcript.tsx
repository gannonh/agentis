import type { Message } from "@workspace/shared"
import { MessageResponse } from "@/components/ai-elements/message"
import { ThreadMessageContent } from "@/components/thread/thread-message-content"
import {
  getTranscriptText,
  messageHasVisibleContent,
} from "@/lib/thread/message-text"

export type ThreadTurn = {
  id: string
  user: Message | null
  replies: Message[]
}

export function isTranscriptMessage(message: Message) {
  if (message.status === "completed" && !messageHasVisibleContent(message)) {
    return false
  }
  return true
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

function ThreadUserPrompt({ message }: { message: Message }) {
  const text = getTranscriptText(message)
  if (!text.trim()) return null

  return (
    <div className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
      <MessageResponse>{text}</MessageResponse>
    </div>
  )
}

function ThreadTurnSection({ turn }: { turn: ThreadTurn }) {
  if (!turn.user) {
    return (
      <section className="flex flex-col gap-6">
        {turn.replies.map((message) => (
          <div key={message.id} className="w-full text-sm text-foreground">
            <ThreadMessageContent message={message} />
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <ThreadUserPrompt message={turn.user} />
      </div>
      {turn.replies.length ? (
        <div className="flex flex-col gap-6 pt-6">
          {turn.replies.map((message) => (
            <div key={message.id} className="w-full text-sm text-foreground">
              <ThreadMessageContent message={message} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function ThreadTranscript({ messages }: { messages: Message[] }) {
  const turns = groupThreadTurns(messages)

  return (
    <>
      {turns.map((turn) => (
        <ThreadTurnSection key={turn.id} turn={turn} />
      ))}
    </>
  )
}
