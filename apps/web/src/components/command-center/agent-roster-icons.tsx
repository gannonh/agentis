import { HugeiconsIcon } from "@hugeicons/react"
import {
  CommandIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import type { Agent } from "@/fixtures/schema"

const agentIcons = {
  search: Search01Icon,
  command: CommandIcon,
} as const

export function AgentRosterIcon({ icon }: { icon?: string }) {
  const Icon =
    icon && icon in agentIcons ? agentIcons[icon as keyof typeof agentIcons] : Search01Icon
  return <HugeiconsIcon icon={Icon} className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
}

export function rosterStatusClass(status: Agent["rosterStatus"]): string {
  switch (status) {
    case "active":
      return "bg-emerald-500"
    case "error":
      return "bg-destructive"
    case "idle":
    default:
      return "bg-muted-foreground/40"
  }
}
