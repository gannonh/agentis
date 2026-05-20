import { Brain01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { LearningPillarHeader } from "@/components/learning/learning-pillar-header"

export function MemoriesCard() {
  return (
    <section
      className="flex min-h-[220px] flex-col rounded-lg border border-border bg-card"
      aria-labelledby="learning-memories-heading"
    >
      <LearningPillarHeader
        icon={Brain01Icon}
        title="Memories"
        headingId="learning-memories-heading"
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        <p className="text-sm font-medium">No memories stored yet</p>
        <p className="text-muted-foreground max-w-[16rem] text-xs leading-relaxed">
          Memories are created when the agent learns about you and your preferences.
        </p>
        <Button variant="outline" size="sm" className="w-full max-w-[12rem]" disabled>
          Browse Memories
        </Button>
      </div>
    </section>
  )
}
