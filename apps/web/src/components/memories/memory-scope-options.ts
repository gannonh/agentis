import type { AgentListItem, CreateSavedMemoryRequest } from "@workspace/shared"

export type MemoryScopeOption = {
  label: string
  value: string
  scope: CreateSavedMemoryRequest["scope"]
  associatedAgent?: string
}

export function getMemoryScopeOptions(
  agents: AgentListItem[]
): MemoryScopeOption[] {
  return [
    { label: "Global (all agents)", value: "global", scope: "global" },
    ...agents.map((agent) => ({
      label: agent.name,
      value: agent.id,
      scope: "agent" as const,
      associatedAgent: agent.id,
    })),
  ]
}
