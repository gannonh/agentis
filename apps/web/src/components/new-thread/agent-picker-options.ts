import { GENERIC_AGENTIS_AGENT_ID, type AgentListItem } from "@workspace/shared"
import type { PickerAgentIcon } from "@/fixtures/schema"

export const DEFAULT_AGENT_PICKER_ID = GENERIC_AGENTIS_AGENT_ID

export type PickerOption = {
  id: string
  name: string
  description: string
  icon: PickerAgentIcon
}

function apiAgentToPickerOption(agent: AgentListItem): PickerOption {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? "Configured agent",
    icon: "search",
  }
}

export const defaultPickerOption: PickerOption = {
  id: DEFAULT_AGENT_PICKER_ID,
  name: "Agentis",
  description: "General purpose agent",
  icon: "agentis",
}

export function buildPickerOptions(agents: AgentListItem[] = []): PickerOption[] {
  return [defaultPickerOption, ...agents.map(apiAgentToPickerOption)]
}

export function agentToPickerMenuOption(agent: AgentListItem): PickerOption {
  return apiAgentToPickerOption(agent)
}
