import { LearningCandidateCard } from "@/components/learning/learning-candidate-card"
import type { LearningCandidate } from "@/fixtures/schema"

type LearningCandidatesSectionProps = {
  candidates: LearningCandidate[]
}

export function LearningCandidatesSection({ candidates }: LearningCandidatesSectionProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="learning-candidates-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="learning-candidates-heading" className="text-sm font-medium">
          Learning candidates
        </h2>
        <span className="text-muted-foreground text-xs">{candidates.length} mocked seed</span>
      </div>
      {candidates.map((candidate) => (
        <LearningCandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </section>
  )
}
