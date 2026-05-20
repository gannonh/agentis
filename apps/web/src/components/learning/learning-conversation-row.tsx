import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  BulbIcon,
  ClipboardIcon,
  Message01Icon,
  MinusSignIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatRelativeTime } from "@/fixtures"
import type { LearningConversation } from "@/fixtures/schema"

const suggestionActions = [
  { label: "Dismiss", icon: MinusSignIcon },
  { label: "Message", icon: Message01Icon },
  { label: "Insight", icon: BulbIcon },
  { label: "Skill", icon: SparklesIcon },
  { label: "Rubric", icon: ClipboardIcon },
] as const

type LearningConversationRowProps = {
  conversation: LearningConversation
}

export function LearningConversationRow({ conversation }: LearningConversationRowProps) {
  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <div className="flex min-w-0 flex-col gap-2">
            <div>
              <h3 className="text-sm font-medium">{conversation.title}</h3>
              <p className="text-muted-foreground text-xs">
                {conversation.messageCount} messages · {formatRelativeTime(conversation.updatedAt)}
              </p>
            </div>
            <Badge variant="outline" className="w-fit gap-1 text-xs font-normal">
              <HugeiconsIcon icon={Search01Icon} className="size-3" strokeWidth={2} />
              {conversation.agentName}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
          {suggestionActions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={action.label}
            >
              <HugeiconsIcon icon={action.icon} className="size-3.5" strokeWidth={2} />
            </Button>
          ))}
        </div>
      </div>
    </article>
  )
}
