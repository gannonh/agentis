import { ClipboardIcon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { LearningPillarHeader } from "@/components/learning/learning-pillar-header"

export function RubricsCard() {
  return (
    <section
      className="flex min-h-[220px] flex-col rounded-lg border border-border bg-card"
      aria-labelledby="learning-rubrics-heading"
    >
      <LearningPillarHeader
        icon={ClipboardIcon}
        title="Rubrics"
        headingId="learning-rubrics-heading"
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        <p className="text-sm font-medium">No evaluations yet</p>
        <p className="text-muted-foreground max-w-[16rem] text-xs leading-relaxed">
          Run an eval on any thread to start tracking quality.
        </p>
        <Button variant="outline" size="sm" className="w-full max-w-[12rem]" disabled>
          Browse Rubrics
        </Button>
      </div>
    </section>
  )
}
