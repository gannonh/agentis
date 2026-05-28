import { BulbIcon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import type { LearningCandidate } from "@/fixtures/schema"

const candidateActionIcons = {
  sparkles: SparklesIcon,
} as const

type LearningCandidateCardProps = {
  candidate: LearningCandidate
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function formatSuggestionType(
  type: LearningCandidate["suggestionType"]
): string {
  return `${capitalize(type)} suggestion`
}

function formatSuggestionState(status: LearningCandidate["status"]): string {
  return status === "suggested" ? "Pending" : "Resolved"
}

export function LearningCandidateCard({
  candidate,
}: LearningCandidateCardProps) {
  const confidence = Math.round(candidate.confidence * 100)

  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <HugeiconsIcon
              icon={BulbIcon}
              className="size-4"
              strokeWidth={2}
              aria-hidden
            />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">{candidate.title}</h3>
              <Badge variant="outline" className="text-xs font-normal">
                {candidate.provenance.label}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {candidate.content}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{candidate.source.threadTitle}</span>
              <span aria-hidden>·</span>
              <span>{formatSuggestionType(candidate.suggestionType)}</span>
              <span aria-hidden>·</span>
              <span>{confidence}% confidence</span>
              <span aria-hidden>·</span>
              <span>{formatSuggestionState(candidate.status)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {candidate.actions.map((action) => {
            const ActionIcon = action.icon
              ? candidateActionIcons[action.icon]
              : null

            return (
              <Button
                key={action.id}
                type="button"
                variant={action.tone === "primary" ? "default" : "outline"}
                size="sm"
                disabled
              >
                {ActionIcon ? (
                  <HugeiconsIcon
                    icon={ActionIcon}
                    className="size-3.5"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
                {action.label}
              </Button>
            )
          })}
        </div>
      </div>
    </article>
  )
}
