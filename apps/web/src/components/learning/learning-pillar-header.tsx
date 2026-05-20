import type { ComponentProps, ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

type LearningPillarHeaderProps = {
  icon: ComponentProps<typeof HugeiconsIcon>["icon"]
  title: string
  headingId?: string
  trailing?: ReactNode
}

export function LearningPillarHeader({
  icon,
  title,
  headingId,
  trailing,
}: LearningPillarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <HugeiconsIcon icon={icon} className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <h2 id={headingId} className="text-sm font-medium">
          {title}
        </h2>
        {trailing}
      </div>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={2}
        aria-hidden
      />
    </div>
  )
}
