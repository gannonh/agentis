import { getStarterAgents, getYourPickerAgents } from "@/fixtures"
import type { Agent, AgentNavIcon, PickerAgentIcon, StarterAgent } from "@/fixtures/schema"

const rosterIconToPickerIcon: Record<AgentNavIcon, PickerAgentIcon> = {
  search: "search",
  command: "briefing",
}

export const DEFAULT_AGENT_PICKER_ID = "agentis"

export type PickerOption = {
  id: string
  name: string
  description: string
  icon: PickerAgentIcon
}

function agentToPickerOption(agent: Agent): PickerOption {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: rosterIconToPickerIcon[agent.icon ?? "search"],
  }
}

function starterToPickerOption(starter: StarterAgent): PickerOption {
  return {
    id: starter.id,
    name: starter.name,
    description: starter.description,
    icon: starter.icon,
  }
}

export const defaultPickerOption: PickerOption = {
  id: DEFAULT_AGENT_PICKER_ID,
  name: "Agentis",
  description: "General purpose agent",
  icon: "agentis",
}

export function buildPickerOptions(): PickerOption[] {
  return [
    defaultPickerOption,
    ...getYourPickerAgents().map(agentToPickerOption),
    ...getStarterAgents().map(starterToPickerOption),
  ]
}

export function agentToPickerMenuOption(agent: Agent): PickerOption {
  return agentToPickerOption(agent)
}

export function starterToPickerMenuOption(starter: StarterAgent): PickerOption {
  return starterToPickerOption(starter)
}
