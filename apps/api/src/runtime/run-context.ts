import type {
  AgentMemorySummary,
  ProjectContextSummary,
  SavedMemory,
  Thread,
} from "@workspace/shared"

export type RunPromptSection = {
  title: string
  body?: string | null
}

export type RunContextContribution = {
  promptSection?: RunPromptSection
  step?: {
    title: string
    payload: Record<string, unknown>
  }
}

function formatSourceWorkflowBlock(thread: Thread): string | undefined {
  if (!thread.sourceWorkflow) return undefined

  return [
    thread.sourceThread
      ? `Source thread: ${thread.sourceThread.title} (${thread.sourceThread.id})`
      : null,
    `Workflow summary: ${thread.sourceWorkflow.summary}`,
    thread.sourceWorkflow.firstUserPrompt
      ? `First user prompt: ${thread.sourceWorkflow.firstUserPrompt}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
}

export function buildSourceWorkflowContribution(
  thread: Thread
): RunContextContribution | null {
  if (!thread.sourceWorkflow) return null

  return {
    promptSection: {
      title: "Source workflow context",
      body: formatSourceWorkflowBlock(thread),
    },
    step: {
      title: "Source workflow context loaded",
      payload: {
        sourceThreadId: thread.sourceThread?.id,
        sourceThreadTitle: thread.sourceThread?.title,
        summary: thread.sourceWorkflow.summary,
        firstUserPrompt: thread.sourceWorkflow.firstUserPrompt,
      },
    },
  }
}

function formatMemory(memory: SavedMemory, index: number): string {
  const guidance = memory.usageGuidance.trim()
  const parts = [
    `${index + 1}. ${memory.content}`,
    `category: ${memory.category}`,
    `importance: ${memory.importance}`,
    guidance ? `usage: ${guidance}` : null,
  ].filter((part): part is string => Boolean(part))
  return parts.join(" | ")
}

function formatAgentMemoriesBlock(memories: AgentMemorySummary): string {
  const lines: string[] = []
  if (memories.agent.length > 0) {
    lines.push(
      "### Agent memories",
      ...memories.agent.map((memory, index) => formatMemory(memory, index))
    )
  }
  if (memories.global.length > 0) {
    lines.push(
      "### Global memories",
      ...memories.global.map((memory, index) => formatMemory(memory, index))
    )
  }
  return lines.join("\n")
}

export function buildAgentMemoriesContribution(
  memories: AgentMemorySummary | null
): RunContextContribution | null {
  if (!memories) return null
  if (memories.agent.length === 0 && memories.global.length === 0) return null

  return {
    promptSection: {
      title: "Agent memories",
      body: formatAgentMemoriesBlock(memories),
    },
    step: {
      title: "Agent memories loaded",
      payload: {
        agentMemoryCount: memories.agent.length,
        globalMemoryCount: memories.global.length,
      },
    },
  }
}

export function buildProjectContextContribution(input: {
  projectContext: ProjectContextSummary | null
  projectContextBlock: string
}): RunContextContribution | null {
  if (!input.projectContext) return null

  return {
    promptSection: {
      title: "Project context",
      body: input.projectContextBlock,
    },
    step: {
      title: "Project context loaded",
      payload: {
        projectId: input.projectContext.project.id,
        projectName: input.projectContext.project.name,
        projectStatus: input.projectContext.project.status,
        goalChars: input.projectContext.goals?.length ?? 0,
        memoryCount: input.projectContext.enabledMemoryCount,
        truncated: input.projectContext.truncated ?? false,
        empty: input.projectContext.empty ?? false,
      },
    },
  }
}
