import { Brain01Icon, ClipboardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import type { Memory } from "@/fixtures/schema"

type LearningSecondaryPanelProps = {
  memories: Memory[]
}

type MemoryCategorySummary = {
  category: Memory["category"]
  count: number
}

function getCategorySummaries(memories: Memory[]): MemoryCategorySummary[] {
  const summaries: MemoryCategorySummary[] = []

  for (const memory of memories) {
    const summary = summaries.find((item) => item.category === memory.category)

    if (summary) {
      summary.count += 1
    } else {
      summaries.push({ category: memory.category, count: 1 })
    }
  }

  return summaries
}

export function LearningSecondaryPanel({ memories }: LearningSecondaryPanelProps) {
  const categorySummaries = getCategorySummaries(memories)

  return (
    <>
      <section
        className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4"
        aria-labelledby="learning-memories-heading"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Brain01Icon}
              className="size-4 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <h2 id="learning-memories-heading" className="text-sm font-medium">
              Memories
            </h2>
          </div>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {memories.length} saved
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Memories are created when agents learn facts, preferences, and active work from
          conversations.
        </p>
        <div className="flex flex-wrap gap-2">
          {categorySummaries.length > 0 ? (
            categorySummaries.map((summary) => (
              <Badge key={summary.category} variant="outline" className="text-xs">
                {summary.category}: {summary.count}
              </Badge>
            ))
          ) : (
            <p className="text-muted-foreground text-xs">No memories stored yet</p>
          )}
        </div>
        <Link
          to="/memories"
          className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
        >
          Browse Memories
        </Link>
      </section>

      <section
        className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4"
        aria-labelledby="learning-rubrics-heading"
      >
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={ClipboardIcon}
            className="size-4 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <h2 id="learning-rubrics-heading" className="text-sm font-medium">
            Rubrics
          </h2>
        </div>
        <p className="text-sm font-medium">No rubrics yet</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Rubrics define how agents evaluate and improve their work over time.
        </p>
        <Button variant="outline" size="sm" className="w-fit" disabled>
          Create Rubric
        </Button>
      </section>
    </>
  )
}
