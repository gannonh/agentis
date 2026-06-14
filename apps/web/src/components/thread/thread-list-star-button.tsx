import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ThreadListStarButtonProps = {
  starred: boolean
  onToggle: () => void
  disabled?: boolean
  size?: "sidebar" | "card"
}

export function ThreadListStarButton({
  starred,
  onToggle,
  disabled = false,
  size = "sidebar",
}: ThreadListStarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={starred ? "Unstar thread" : "Star thread"}
      aria-pressed={starred}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-foreground",
        size === "sidebar" ? "size-6" : "size-7"
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
    >
      <HugeiconsIcon
        icon={StarIcon}
        className={cn(
          size === "sidebar" ? "size-3.5" : "size-4",
          starred && "fill-current text-amber-500"
        )}
        strokeWidth={2}
      />
    </Button>
  )
}
