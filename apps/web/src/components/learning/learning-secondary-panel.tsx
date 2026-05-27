import { Brain01Icon, ClipboardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import type { Memory } from "@/fixtures/schema"

type LearningSecondaryPanelProps = {
  memories: Memory[]
}

function getCategorySummaries(memories: Memory[]) {
  return memories.reduce<Array<{ category: Memory["category"]; count: number }>>((summaries, memory) => {
    const summary = summaries.find((item) => item.category === memory.category)
    if (summary) {
      summary.count += 1
      return summaries
    }
    summaries.push({ category: memory.category, count: 1 })
    return summaries
  }, [])
}

export function LearningSecondaryPanel({ memories }: LearningSecondaryPanelProps) {
  const categorySummaries = getCategorySummaries(memories)

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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Brain01Icon}
                className="size-4 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <h3 className="text-sm font-medium">Memories</h3>
            </div>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {memories.length} saved
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Memories are created when agents learn facts, preferences, and active work from conversations.
          </p>
          <div className="flex flex-wrap gap-2">
            {categorySummaries.map((summary) => (
              <Badge key={summary.category} variant="outline" className="text-xs">
                {summary.category}: {summary.count}
              </Badge>
            ))}
          </div>
          <Link
            to="/memories"
            className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
          >
            Browse Memories
          </Link>
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
