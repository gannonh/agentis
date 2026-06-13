import {
  BookOpen01Icon,
  FileEditIcon,
  Search01Icon,
  UserGroupIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import type { AgentListItem, ThreadMode } from "@workspace/shared"
import { RESEARCH_TOPIC_PROMPT } from "./research-prompt"

export type SuggestionChip = {
  id: string
  label: string
  icon: typeof Search01Icon
  prompt: string
  agentId?: string
  mode?: ThreadMode
}

const MAX_SUGGESTION_CHIPS = 5

const STATIC_SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    id: "research-topic",
    label: "Research a topic",
    icon: Search01Icon,
    prompt: RESEARCH_TOPIC_PROMPT,
    mode: "agent",
  },
  {
    id: "launch-readiness",
    label: "Launch readiness update",
    icon: WorkflowSquare01Icon,
    prompt:
      "Prepare a launch readiness update with owners, risks, and decisions for the current workspace.",
    mode: "agent",
  },
  {
    id: "support-triage",
    label: "Triage support escalations",
    icon: UserGroupIcon,
    prompt:
      "Triage these support escalations and draft short customer replies for each case.",
    mode: "agent",
  },
  {
    id: "docs-refresh",
    label: "Docs refresh checklist",
    icon: FileEditIcon,
    prompt:
      "Audit the docs for project memory, library uploads, and agent configuration gaps. Produce a refresh checklist.",
    mode: "plan",
  },
  {
    id: "config-research",
    label: "Configuration research brief",
    icon: BookOpen01Icon,
    prompt:
      "Create a concise research brief about the agent configuration patterns we should support first.",
    mode: "agent",
  },
]

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase()
}

function addUniqueChip(
  chips: SuggestionChip[],
  seenPrompts: Set<string>,
  chip: SuggestionChip
): void {
  if (chips.length >= MAX_SUGGESTION_CHIPS) return
  const key = normalizePrompt(chip.prompt)
  if (seenPrompts.has(key)) return
  seenPrompts.add(key)
  chips.push(chip)
}

export function buildSuggestionChips(agents: AgentListItem[]): SuggestionChip[] {
  const seenPrompts = new Set<string>()
  const chips: SuggestionChip[] = []

  for (const agent of agents) {
    const prompt = agent.sourceWorkflow?.firstUserPrompt?.trim()
    if (!prompt) continue

    addUniqueChip(chips, seenPrompts, {
      id: `agent-${agent.id}`,
      label: agent.name,
      icon: WorkflowSquare01Icon,
      prompt,
      agentId: agent.id,
      mode: "agent",
    })
  }

  for (const chip of STATIC_SUGGESTION_CHIPS) {
    addUniqueChip(chips, seenPrompts, chip)
  }

  return chips
}
