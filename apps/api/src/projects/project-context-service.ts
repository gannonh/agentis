import type { ProjectContextSummary } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"

function truncate(text: string, maxChars: number) {
  if (text.length <= maxChars) return { text, truncated: false }
  return { text: `${text.slice(0, maxChars)}…`, truncated: true }
}

export class ProjectContextService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {}

  assemble(projectId: string | null | undefined): ProjectContextSummary | null {
    if (!projectId) return null
    const project = this.repos.projects.getById(projectId)
    if (!project) return null

    const memories = this.repos.projectMemories
      .listByProjectId(projectId)
      .filter((memory) => memory.enabled)

    const goalsResult = project.goals
      ? truncate(project.goals, this.config.projectGoalsMaxChars)
      : { text: null as string | null, truncated: false }

    const boundedMemories = memories.map((memory) => {
      const result = truncate(memory.content, this.config.projectMemoryMaxChars)
      return {
        ...memory,
        content: result.text,
      }
    })

    const truncated =
      goalsResult.truncated ||
      memories.some(
        (memory, index) =>
          memory.content !== boundedMemories[index]?.content
      )

    const hasGoals = Boolean(goalsResult.text?.trim())
    const enabledMemoryCount = boundedMemories.length
    const empty = !hasGoals && enabledMemoryCount === 0

    return {
      project,
      goals: goalsResult.text,
      memories: boundedMemories,
      enabledMemoryCount,
      truncated: truncated || undefined,
      empty: empty || undefined,
    }
  }

  buildSystemPromptBlock(summary: ProjectContextSummary | null): string {
    if (!summary || summary.empty) return ""
    const lines: string[] = ["## Project context"]
    if (summary.project.status === "archived") {
      lines.push(
        `Project "${summary.project.name}" is archived. Context is preserved for existing threads.`
      )
    } else {
      lines.push(`Project: ${summary.project.name}`)
    }
    if (summary.goals?.trim()) {
      lines.push("### Goals", summary.goals.trim())
    }
    if (summary.memories.length > 0) {
      lines.push(
        "### Enabled memories",
        ...summary.memories.map((memory, index) => `${index + 1}. ${memory.content}`)
      )
    }
    return lines.join("\n")
  }

  validateProjectForNewThread(projectId: string | undefined): {
    ok: true
  } | {
    ok: false
    code: "project_not_found" | "project_archived"
    message: string
  } {
    if (!projectId) return { ok: true }
    const project = this.repos.projects.getById(projectId)
    if (!project) {
      return {
        ok: false,
        code: "project_not_found",
        message: "Project not found",
      }
    }
    if (project.status === "archived") {
      return {
        ok: false,
        code: "project_archived",
        message: "Project is archived. Select an active project.",
      }
    }
    return { ok: true }
  }
}
