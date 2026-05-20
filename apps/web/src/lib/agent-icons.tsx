import { HugeiconsIcon } from "@hugeicons/react"
import {
  CommandIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@workspace/ui/lib/utils"

const agentIcons = {
  search: Search01Icon,
  command: CommandIcon,
} as const

type AgentIconProps = {
  icon?: string
  className?: string
  size?: "sm" | "lg"
}

export function AgentIcon({ icon, className, size = "sm" }: AgentIconProps) {
  const Icon =
    icon && icon in agentIcons ? agentIcons[icon as keyof typeof agentIcons] : Search01Icon
  return (
    <HugeiconsIcon
      icon={Icon}
      className={cn(
        size === "lg" ? "size-6" : "size-4",
        "shrink-0 text-muted-foreground",
        className
      )}
      strokeWidth={2}
    />
  )
}
