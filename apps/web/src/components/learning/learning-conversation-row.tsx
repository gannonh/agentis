import { useState } from "react"
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
import { LearningCandidatesSection } from "@/components/learning/learning-candidates-section"
import { formatRelativeTime } from "@/fixtures"
import type { LearningCandidate, LearningConversation } from "@/fixtures/schema"

const suggestionActions = [
  { label: "Dismiss", icon: MinusSignIcon },
  { label: "Message", icon: Message01Icon },
  { label: "Insight", icon: BulbIcon },
  { label: "Skill", icon: SparklesIcon },
  { label: "Rubric", icon: ClipboardIcon },
] as const

type LearningConversationRowProps = {
  conversation: LearningConversation
  candidates?: LearningCandidate[]
  onEditMemory?: (candidate: LearningCandidate) => void
}

export function LearningConversationRow({
  conversation,
  candidates = [],
  onEditMemory,
}: LearningConversationRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasSuggestions = candidates.length > 0

  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${conversation.title}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="mt-0.5"
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className={expanded ? "size-3.5 rotate-90" : "size-3.5"}
              strokeWidth={2}
              aria-hidden
            />
          </Button>
          <div className="flex min-w-0 flex-col gap-2">
            <div>
              <h3 className="text-sm font-medium">{conversation.title}</h3>
              <p className="text-xs text-muted-foreground">
                {conversation.messageCount} messages ·{" "}
                {formatRelativeTime(conversation.updatedAt)}
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit gap-1 text-xs font-normal"
            >
              <HugeiconsIcon
                icon={Search01Icon}
                className="size-3"
                strokeWidth={2}
              />
              {conversation.agentName}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
          {hasSuggestions ? (
            <Badge variant="secondary" className="mr-1 text-xs font-normal">
              {candidates.length}{" "}
              {candidates.length === 1 ? "suggestion" : "suggestions"}
            </Badge>
          ) : null}
          {suggestionActions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={action.label}
            >
              <HugeiconsIcon
                icon={action.icon}
                className="size-3.5"
                strokeWidth={2}
              />
            </Button>
          ))}
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-border pt-4">
          {hasSuggestions ? (
            <LearningCandidatesSection
              candidates={candidates}
              onEditMemory={onEditMemory}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              No memory candidates linked yet
            </p>
          )}
        </div>
      ) : null}
    </article>
  )
}
