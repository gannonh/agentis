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
        <HugeiconsIcon icon={MinusSignIcon} className="size-3.5" strokeWidth={2} />
        Flat
      </span>
    )
  }

  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" strokeWidth={2} />
        Up
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
      <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2} />
      Down
    </span>
  )
}
