import { Brain01Icon, ClipboardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"

export function LearningSecondaryPanel() {
  return (
    <section
      className="rounded-lg border border-border bg-card"
      aria-labelledby="learning-secondary-heading"
    >
      <h2 id="learning-secondary-heading" className="sr-only">
        Memories and rubrics
      </h2>
      <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-border">
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Brain01Icon}
              className="size-4 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <h3 className="text-sm font-medium">Memories</h3>
          </div>
          <p className="text-sm font-medium">No memories stored yet</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Memories are created when the agent learns about you and your preferences.
          </p>
          <Button variant="outline" size="sm" className="w-fit" disabled>
            Browse Memories
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 md:border-t-0">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={ClipboardIcon}
              className="size-4 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <h3 className="text-sm font-medium">Rubrics</h3>
          </div>
          <p className="text-sm font-medium">No rubrics yet</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Rubrics define how agents evaluate and improve their work over time.
          </p>
          <Button variant="outline" size="sm" className="w-fit" disabled>
            Create Rubric
          </Button>
        </div>
      </div>
    </section>
  )
}
