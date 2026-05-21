import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"

export function IntegrationsBackNav() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground -ml-2 h-8 gap-1.5 px-2 font-normal"
      disabled
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
      Back to Settings
    </Button>
  )
}
