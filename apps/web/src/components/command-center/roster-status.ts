import type { Agent } from "@/fixtures/schema"

export function rosterStatusLabel(status: Agent["rosterStatus"]): string {
  switch (status) {
    case "active":
      return "Active"
    case "error":
      return "Error"
    case "idle":
    default:
      return "Idle"
  }
}

export function rosterStatusClass(status: Agent["rosterStatus"]): string {
  switch (status) {
    case "active":
      return "bg-status-success"
    case "error":
      return "bg-destructive"
    case "idle":
    default:
      return "bg-muted-foreground/40"
  }
}
