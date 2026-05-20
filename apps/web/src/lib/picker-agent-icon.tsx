import { HugeiconsIcon } from "@hugeicons/react"
import {
  Analytics01Icon,
  Briefcase01Icon,
  ChartIncreaseIcon,
  Edit01Icon,
  Rocket01Icon,
  Search01Icon,
  Sun03Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"
import type { PickerAgentIcon } from "@/fixtures/schema"

const iconMap = {
  agentis: null,
  search: Search01Icon,
  briefing: Briefcase01Icon,
  chief: Sun03Icon,
  analyst: Analytics01Icon,
  developer: Rocket01Icon,
  investment: ChartIncreaseIcon,
  recruiter: UserGroupIcon,
  sales: ChartIncreaseIcon,
  create: Edit01Icon,
} as const

const toneMap: Partial<Record<PickerAgentIcon, string>> = {
  search: "bg-status-success-muted text-status-success-foreground",
  briefing: "bg-muted text-muted-foreground",
  chief: "bg-status-warning-muted text-status-warning-foreground",
  analyst: "bg-status-info-muted text-status-info-foreground",
  developer: "bg-agent-blue/15 text-agent-blue",
  investment: "bg-status-success-muted text-status-success-foreground",
  recruiter: "bg-agent-blue/15 text-agent-blue",
  sales: "bg-destructive/10 text-destructive",
  create: "bg-muted text-muted-foreground",
}

type PickerAgentIconMarkProps = {
  icon: PickerAgentIcon
  className?: string
  size?: "sm" | "md"
}

export function PickerAgentIconMark({
  icon,
  className,
  size = "md",
}: PickerAgentIconMarkProps) {
  const box = size === "sm" ? "size-7" : "size-8"

  if (icon === "agentis") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold",
          box,
          className
        )}
      >
        A
      </span>
    )
  }

  const Icon = iconMap[icon] ?? Search01Icon

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        box,
        toneMap[icon] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      <HugeiconsIcon icon={Icon} className="size-4" strokeWidth={2} />
    </span>
  )
}
