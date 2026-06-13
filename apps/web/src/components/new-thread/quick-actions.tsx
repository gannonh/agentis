import { HugeiconsIcon } from "@hugeicons/react"
import type { AgentListItem } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  buildSuggestionChips,
  type SuggestionChip,
} from "@/components/new-thread/suggestion-chips"

type QuickActionsProps = {
  agents: AgentListItem[]
  onSelectChip: (chip: SuggestionChip) => void
}

export function QuickActions({ agents, onSelectChip }: QuickActionsProps) {
  const chips = buildSuggestionChips(agents)

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map((chip) => (
        <Button
          key={chip.id}
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onSelectChip(chip)}
        >
          <HugeiconsIcon icon={chip.icon} className="size-3.5" strokeWidth={2} />
          {chip.label}
        </Button>
      ))}
    </div>
  )
}
