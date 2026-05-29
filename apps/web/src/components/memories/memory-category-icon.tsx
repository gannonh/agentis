import type { ReactElement } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { SavedMemoryCategoryKey } from "@workspace/shared"
import { cn } from "@workspace/ui/lib/utils"
import { getCategoryDisplay } from "./memory-category-display"

type CategoryIconProps = {
  category: SavedMemoryCategoryKey
  className?: string
}

export function CategoryIcon({
  category,
  className,
}: CategoryIconProps): ReactElement {
  const display = getCategoryDisplay(category)

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border",
        display.tone,
        className
      )}
    >
      <HugeiconsIcon
        icon={display.icon}
        className="size-3.5"
        strokeWidth={2}
        aria-hidden
      />
    </span>
  )
}
