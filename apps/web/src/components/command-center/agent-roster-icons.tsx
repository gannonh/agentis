import { AgentIcon } from "@/lib/agent-icons"
import type { Agent } from "@/fixtures/schema"

export function AgentRosterIcon({ icon }: { icon?: string }) {
  return <AgentIcon icon={icon} />
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
