import { useId } from "react"
import { BulbIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { LearningCandidateCard } from "@/components/learning/learning-candidate-card"
import type { LearningCandidate } from "@/fixtures/schema"

type LearningCandidatesSectionProps = {
  candidates: LearningCandidate[]
}

export function LearningCandidatesSection({
  candidates,
}: LearningCandidatesSectionProps) {
  const headingId = useId()

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
      {candidates.map((candidate) => (
        <LearningCandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </section>
  )
}
