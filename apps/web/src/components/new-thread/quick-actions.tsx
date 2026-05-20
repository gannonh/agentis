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
  { label: "Design a website", icon: LayoutGridIcon },
  { label: "Source candidates", icon: UserGroupIcon },
  { label: "Research a topic", icon: Search01Icon },
  { label: "Generate images", icon: Image01Icon },
  { label: "More...", icon: MoreHorizontalIcon },
] as const

export function QuickActions() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {quickActions.map((action) => (
        <Button key={action.label} variant="outline" size="sm" className="gap-1.5" disabled>
          <HugeiconsIcon icon={action.icon} className="size-3.5" strokeWidth={2} />
          {action.label}
        </Button>
      ))}
    </div>
  )
}
