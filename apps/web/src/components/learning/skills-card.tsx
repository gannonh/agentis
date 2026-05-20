import { HugeiconsIcon } from "@hugeicons/react"
import { PuzzleIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { LearningPillarHeader } from "@/components/learning/learning-pillar-header"
import type { Skill } from "@/fixtures/schema"

type SkillsCardProps = {
  skills: Skill[]
  pinnedCount: number
  previewCount?: number
}

export function SkillsCard({
  skills,
  pinnedCount,
  previewCount = 5,
}: SkillsCardProps) {
  const preview = skills.slice(0, previewCount)

  return (
    <section
      className="flex flex-col rounded-lg border border-border bg-card"
      aria-labelledby="learning-skills-heading"
    >
      <LearningPillarHeader
        icon={PuzzleIcon}
        title="Skills"
        headingId="learning-skills-heading"
        trailing={
          <>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {skills.length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pinnedCount} pinned
            </Badge>
          </>
        }
      />
      <div className="flex flex-col gap-2 px-4 py-3">
        <ul className="flex flex-col gap-2">
          {preview.map((skill) => (
            <li key={skill.id} className="flex items-center gap-2 text-sm">
              <HugeiconsIcon
                icon={PuzzleIcon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
              <span className="truncate font-mono text-xs">{skill.name}</span>
            </li>
          ))}
        </ul>
        <Button variant="link" className="h-auto justify-start p-0 text-xs" disabled>
          View all {skills.length} skills →
        </Button>
      </div>
    </section>
  )
}
