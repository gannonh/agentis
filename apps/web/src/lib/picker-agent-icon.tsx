import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Analytics01Icon,
  Briefcase01Icon,
  ChartIncreaseIcon,
  Edit01Icon,
  Image01Icon,
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
  search: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  briefing: "bg-muted text-muted-foreground",
  chief: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  analyst: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  developer: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  investment: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  recruiter: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  sales: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
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
