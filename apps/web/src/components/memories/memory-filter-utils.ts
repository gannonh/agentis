import type {
  AgentListItem,
  SavedMemory,
  SavedMemoryCategory,
  SavedMemoryCategoryKey,
} from "@workspace/shared"

export type MemoryScopeFilter = "all" | "global" | `agent:${string}`

export function getCategoryNameMap(
  categories: SavedMemoryCategory[]
): Map<SavedMemoryCategoryKey, string> {
  return new Map(categories.map((category) => [category.id, category.name]))
}

export function getSelectedCategory(
  categories: SavedMemoryCategory[],
  selectedCategory: SavedMemoryCategoryKey | null
): SavedMemoryCategory | null {
  if (selectedCategory === null) {
    return null
  }

  return categories.find((item) => item.id === selectedCategory) ?? null
}

function getAgentIdFromScopeFilter(
  scopeFilter: MemoryScopeFilter
): string | null {
  if (!scopeFilter.startsWith("agent:")) return null
  return scopeFilter.slice("agent:".length)
}

export function getScopeFilterLabel(
  scopeFilter: MemoryScopeFilter,
  agents: AgentListItem[]
): string {
  if (scopeFilter === "all") return "All Memories"
  if (scopeFilter === "global") return "Global"

  const selectedAgentId = getAgentIdFromScopeFilter(scopeFilter)
  return agents.find((agent) => agent.id === selectedAgentId)?.name ?? "Agent"
}

export function memoryMatchesScopeFilter(
  memory: SavedMemory,
  scopeFilter: MemoryScopeFilter
): boolean {
  if (scopeFilter === "all") return true
  if (scopeFilter === "global") return memory.scope === "global"

  const agentId = getAgentIdFromScopeFilter(scopeFilter)
  if (!agentId) return false

  return (
    memory.scope === "agent" &&
    (memory.associatedAgents.includes(agentId) ||
      memory.associatedAgent === agentId)
  )
}

export function memoryMatchesSearch(
  memory: SavedMemory,
  categoryName: string,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    memory.content,
    memory.usageGuidance,
    memory.source,
    memory.provenance,
    memory.associatedAgent ?? "",
    ...memory.associatedAgents,
    memory.scope,
    memory.importance,
    categoryName,
    ...memory.tags,
  ].some((value) => value.toLowerCase().includes(normalizedQuery))
}
