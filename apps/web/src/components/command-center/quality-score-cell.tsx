import { cn } from "@workspace/ui/lib/utils"

type QualityScoreCellProps = {
  score: number | null | undefined
}

export function QualityScoreCell({ score }: QualityScoreCellProps) {
  if (score == null) {
    return <span className="text-muted-foreground">—</span>
  }

  const tone =
    score >= 90
      ? "bg-status-success"
      : score >= 80
        ? "bg-status-success/70"
        : "bg-status-warning"

  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quality score ${score} percent`}
      >
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums">{score}%</span>
    </div>
  )
}
