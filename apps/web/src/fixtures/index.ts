import { demoWorkspace } from "./demo-workspace"
import type { Agent, Thread, Workspace } from "./schema"
import { workspaceSchema } from "./schema"

let workspace: Workspace = demoWorkspace

export function getWorkspace(): Workspace {
  return workspace
}

export function getAgent(id: string): Agent | undefined {
  return workspace.agents.find((agent) => agent.id === id)
}

export function getThread(id: string): Thread | undefined {
  return workspace.threads.find((thread) => thread.id === id)
}

export function getAgentsForRoster(): Agent[] {
  return workspace.agents.filter((agent) => agent.id !== "command-center")
}

export function getYourPickerAgents(): Agent[] {
  return getAgentsForRoster()
}

export function getStarterAgents() {
  return workspace.starterAgents
}

export function getNavAgents(): Agent[] {
  return workspace.agents
}

export function formatRelativeTime(iso: string): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) {
    return "—"
  }
  const now = new Date("2026-05-20T12:51:00.000Z").getTime()
  const diffMs = Math.max(0, now - then)
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Test-only: reset fixture snapshot */
export function __setWorkspaceForTests(next: Workspace): void {
  workspace = workspaceSchema.parse(next)
}

export function __resetWorkspaceForTests(): void {
  workspace = demoWorkspace
}

export { demoWorkspace }
