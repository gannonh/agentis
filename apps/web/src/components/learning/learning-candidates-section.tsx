import { useId } from "react"
import { BulbIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { LearningCandidateCard } from "@/components/learning/learning-candidate-card"
import type { LearningCandidate } from "@/fixtures/schema"

type LearningCandidatesSectionProps = {
  candidates: LearningCandidate[]
  onEditMemory?: (candidate: LearningCandidate) => void
}

function isPendingSuggestion(candidate: LearningCandidate): boolean {
  return candidate.status === "suggested"
}

export function LearningCandidatesSection({
  candidates,
  onEditMemory,
}: LearningCandidatesSectionProps) {
  const headingId = useId()
  const pendingCandidates = candidates.filter(isPendingSuggestion)
  const resolvedCandidates = candidates.filter(
    (candidate) => !isPendingSuggestion(candidate)
  )

  if (candidates.length === 0) return null

  return (
    <section className="flex flex-col gap-3" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <HugeiconsIcon
            icon={BulbIcon}
            className="size-4 text-amber-400"
            strokeWidth={2}
            aria-hidden
          />
          Suggestions
        </h2>
        <span className="text-xs text-muted-foreground">
          {candidates.length}{" "}
          {candidates.length === 1 ? "suggestion" : "suggestions"}
        </span>
      </div>

      {pendingCandidates.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-muted-foreground">Pending</h3>
          {pendingCandidates.map((candidate) => (
            <LearningCandidateCard
              key={candidate.id}
              candidate={candidate}
              onEditMemory={onEditMemory}
            />
          ))}
        </div>
      ) : null}

      {resolvedCandidates.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-medium text-muted-foreground">
            Resolved
          </h3>
          {resolvedCandidates.map((candidate) => (
            <LearningCandidateCard
              key={candidate.id}
              candidate={candidate}
              onEditMemory={onEditMemory}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
