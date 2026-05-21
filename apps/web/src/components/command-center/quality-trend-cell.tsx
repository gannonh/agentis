import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"
import type { Agent } from "@/fixtures/schema"

type QualityTrendCellProps = {
  trend: Agent["qualityTrend"]
}

export function QualityTrendCell({ trend }: QualityTrendCellProps) {
  if (!trend || trend === "flat") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" strokeWidth={2} aria-hidden />
        Flat
      </span>
    )
  }

  if (trend === "up") {
    return (
      <span className="text-status-success-foreground inline-flex items-center gap-1 text-xs">
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
        Up
      </span>
    )
  }

  if (trend === "down") {
    return (
      <span className="text-status-warning-foreground inline-flex items-center gap-1 text-xs">
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
        Down
      </span>
    )
  }

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
      <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" strokeWidth={2} aria-hidden />
      —
    </span>
  )
}
