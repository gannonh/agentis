import type { Message } from "@workspace/shared"
import { MessageResponse } from "@/components/ai-elements/message"
import { ThreadMessageContent } from "@/components/thread/thread-message-content"
import { cn } from "@workspace/ui/lib/utils"
import { getTranscriptText } from "@/lib/thread/message-text"
import {
  groupThreadTurns,
  type ThreadTurn,
} from "@/components/thread/thread-transcript-turns"

function ThreadUserPrompt({ message }: { message: Message }) {
  const text = getTranscriptText(message)
  if (!text.trim()) return null

  return (
    <div className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
      <MessageResponse>{text}</MessageResponse>
    </div>
  )
}

function ThreadAssistantReplies({
  messages,
  className,
}: {
  messages: Message[]
  className?: string
}) {
  if (!messages.length) return null

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {messages.map((message) => (
        <div key={message.id} className="w-full text-sm text-foreground">
          <ThreadMessageContent message={message} />
        </div>
      ))}
    </div>
  )
}

function ThreadTurnSection({ turn }: { turn: ThreadTurn }) {
  if (!turn.user) {
    return (
      <section>
        <ThreadAssistantReplies messages={turn.replies} />
      </section>
    )
  }

  return (
    <section className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <ThreadUserPrompt message={turn.user} />
      </div>
      <ThreadAssistantReplies
        messages={turn.replies}
        className="pt-6"
      />
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
