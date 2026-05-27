import { Brain01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import type { LearningCandidate } from "@/fixtures/schema"

type LearningCandidateCardProps = {
  candidate: LearningCandidate
}

function formatSuggestionType(type: LearningCandidate["suggestionType"]): string {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} suggestion`
}

export function LearningCandidateCard({ candidate }: LearningCandidateCardProps) {
  const confidence = Math.round(candidate.confidence * 100)

  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-status-success-muted text-status-success-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
            <HugeiconsIcon icon={Brain01Icon} className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">{candidate.title}</h3>
              <Badge variant="outline" className="text-xs font-normal">
                {candidate.provenance.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">{candidate.content}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{candidate.source.threadTitle}</span>
              <span aria-hidden>·</span>
              <span>{formatSuggestionType(candidate.suggestionType)}</span>
              <span aria-hidden>·</span>
              <span>{confidence}% confidence</span>
              <span aria-hidden>·</span>
              <span>{candidate.status}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {candidate.actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.id === "save-memory" ? "default" : "outline"}
              size="sm"
              disabled
            >
              {action.id === "save-memory" ? (
                <HugeiconsIcon icon={SparklesIcon} className="size-3.5" strokeWidth={2} />
              ) : null}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </article>
  )
}
