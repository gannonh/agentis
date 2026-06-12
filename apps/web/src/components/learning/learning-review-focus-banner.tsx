import type { ReactElement } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon } from "@hugeicons/core-free-icons"
import type { LearningCandidate } from "@/fixtures/schema"

type LearningReviewFocusBannerProps = {
  candidate: LearningCandidate
}

export function LearningReviewFocusBanner({
  candidate,
}: LearningReviewFocusBannerProps): ReactElement {
  return (
    <section
      className="rounded-lg border border-status-warning-border bg-status-warning-muted px-4 py-3"
      aria-labelledby="learning-review-focus-heading"
      data-testid="learning-review-focus-banner"
    >
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          icon={Alert02Icon}
          className="mt-0.5 size-4 shrink-0 text-status-warning-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="learning-review-focus-heading"
            className="text-sm font-medium"
          >
            Review memory suggestion
          </h2>
          <p className="text-xs text-muted-foreground">
            From Command Center: <span className="font-medium">{candidate.title}</span>
            . Save it as agent memory or dismiss it if it is not useful.
          </p>
        </div>
      </div>
    </section>
  )
}

type LearningReviewFocusMissingBannerProps = {
  suggestionId: string
}

export function LearningReviewFocusMissingBanner({
  suggestionId,
}: LearningReviewFocusMissingBannerProps): ReactElement {
  return (
    <section
      className="rounded-lg border border-border bg-muted/40 px-4 py-3"
      role="status"
      data-testid="learning-review-focus-missing-banner"
    >
      <p className="text-sm font-medium">Suggestion not available</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Could not find pending suggestion{" "}
        <span className="font-mono">{suggestionId}</span>. It may have been
        accepted, dismissed, or removed.
      </p>
    </section>
  )
}
