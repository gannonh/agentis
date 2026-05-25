export const AGENT_DETAIL_TABS = [
  "overview",
  "identity",
  "activity",
  "model",
  "invocations",
  "tools",
  "skills",
  "knowledge",
] as const

export type AgentDetailTab = (typeof AGENT_DETAIL_TABS)[number]

export type AgentDetailConfigureTab = Extract<
  AgentDetailTab,
  "invocations" | "tools" | "skills" | "knowledge"
>

export function isAgentDetailTab(value: string): value is AgentDetailTab {
  return (AGENT_DETAIL_TABS as readonly string[]).includes(value)
}
