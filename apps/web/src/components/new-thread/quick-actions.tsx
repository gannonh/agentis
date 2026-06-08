import { HugeiconsIcon } from "@hugeicons/react"
import {
  Image01Icon,
  LayoutGridIcon,
  MoreHorizontalIcon,
  Search01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"

const quickActions = [
  { label: "Design a website", icon: LayoutGridIcon, enabled: false },
  { label: "Source candidates", icon: UserGroupIcon, enabled: false },
  { label: "Research a topic", icon: Search01Icon, enabled: true },
  { label: "Generate images", icon: Image01Icon, enabled: false },
  { label: "More...", icon: MoreHorizontalIcon, enabled: false },
] as const

type QuickActionsProps = {
  onResearchTopic?: () => void
}

export function QuickActions({ onResearchTopic }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {quickActions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!action.enabled}
          onClick={
            action.label === "Research a topic" ? onResearchTopic : undefined
          }
        >
          <HugeiconsIcon icon={action.icon} className="size-3.5" strokeWidth={2} />
          {action.label}
        </Button>
      ))}
    </div>
  )
}
