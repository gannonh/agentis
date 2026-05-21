import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"

export function LearningBanner() {
  return (
    <Collapsible defaultOpen className="group/banner">
      <div className="border-status-success-border bg-status-success-muted rounded-lg border">
        <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left">
          <span className="bg-status-success-muted text-status-success-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
            <HugeiconsIcon icon={SparklesIcon} className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium">Your agents learn from conversations</p>
            <p className="text-muted-foreground text-xs">
              Review suggestions below and accept the ones worth keeping.
            </p>
          </div>
          <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
            Expand
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className="size-3.5 transition-transform group-data-panel-open/banner:rotate-180"
              strokeWidth={2}
              aria-hidden
            />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-status-success-border border-t px-4 py-3">
          <p className="text-muted-foreground text-xs">
            Accepted skills, memories, and rubrics stay linked to the agents that earned them.
          </p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
