import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"

export function ThreadComposer() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm">
      <div className="flex flex-col gap-3 bg-card p-4 pb-2 dark:bg-[oklch(0.1776_0_0)]">
        <label htmlFor="thread-task" className="sr-only">
          Task
        </label>
        <Textarea
          id="thread-task"
          placeholder="What's the task?"
          className="min-h-28 resize-none border-0 !bg-transparent p-0 text-base shadow-none focus-visible:ring-0 disabled:opacity-100 dark:!bg-transparent"
          disabled
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled
            aria-label="Add attachment"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled
            aria-label="Composer settings"
          >
            <HugeiconsIcon icon={Settings01Icon} className="size-4" strokeWidth={2} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" disabled>
            Plan
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" strokeWidth={2} />
          </Button>
          <Button
            type="button"
            size="icon"
            className="size-8 rounded-full"
            disabled
            aria-label="Submit task"
          >
            <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" strokeWidth={2} />
          </Button>
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 py-2.5">
        <p className="text-muted-foreground text-xs">
          Connect your integrations → Slack, Gmail, Drive…
        </p>
      </div>
    </div>
  )
}
