import type { ProjectContextSummary, Thread } from "@workspace/shared"

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
