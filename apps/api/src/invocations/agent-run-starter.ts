import type { ComposioServices } from "../composio/index.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantErrorMessage,
} from "../agents/tool-grant-resolution.js"
import type { AppConfig } from "../config.js"
import { summarizeTitle } from "../lib/title-summary.js"
import { toSourceWorkflowSnapshot } from "../lib/source-workflow-snapshot.js"
import type { Repositories } from "../repositories/index.js"
import { RunExecutor } from "../runtime/run-executor.js"
import { DocumentService } from "../documents/document-service.js"
import {
  formatMissingEnvVarsMessage,
  getRuntimeMissingEnvVars,
} from "../config.js"

export type AgentRunStartResult =
  | {
      ok: true
      threadId: string
      runId: string
    }
  | {
      ok: false
      code: string
      message: string
      remediation?: string
    }

export function createRunExecutor(
  repos: Repositories,
  config: AppConfig,
  services: ComposioServices
) {
  return new RunExecutor(
    repos,
    config,
    services,
    new DocumentService(repos, config)
  )
}

export function startAgentInvocationRun(
  repos: Repositories,
  input: {
    agentId: string
    prompt: string
    projectId?: string | null
  }
): AgentRunStartResult {
  const agent = repos.agents.getById(input.agentId)
  if (!agent) {
    return {
      ok: false,
      code: "agent_not_found",
      message: "Agent not found.",
    }
  }

  if (input.projectId) {
    const project = repos.projects.getById(input.projectId)
    if (!project || project.status === "archived") {
      return {
        ok: false,
        code: "invalid_invocation_project",
        message: "Project is not available for invocation runs.",
      }
    }
  }

  try {
    const version = repos.agents.getCurrentConfigurationSnapshot(agent.id)
    const resolvedGrants = resolveRequestedAgentGrants(repos, version.toolGrants)
    if ("error" in resolvedGrants) {
      return {
        ok: false,
        code: resolvedGrants.error,
        message: toolkitGrantErrorMessage(resolvedGrants.error),
      }
    }

    const created = repos.threads.createWithInitialRun({
      title: summarizeTitle(input.prompt),
      prompt: input.prompt,
      model: version.model,
      mode: "agent",
      projectId: input.projectId ?? undefined,
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentConfigurationVersionId: version.id,
      ...toSourceWorkflowSnapshot({
        sourceThread: agent.sourceThread,
        sourceWorkflow: agent.sourceWorkflow,
      }),
      toolGrants: resolvedGrants.grants,
    })

    return {
      ok: true,
      threadId: created.thread.id,
      runId: created.run.id,
    }
  } catch (error) {
    return {
      ok: false,
      code: "invocation_run_creation_failed",
      message:
        error instanceof Error
          ? error.message
          : "Failed to create invocation run.",
    }
  }
}

/** @deprecated Use startAgentInvocationRun */
export const startAgentScheduledRun = startAgentInvocationRun

export function validateRuntimeForExecution(config: AppConfig): string | null {
  const missingRuntimeEnv = getRuntimeMissingEnvVars(config)
  if (missingRuntimeEnv.length > 0) {
    return formatMissingEnvVarsMessage(missingRuntimeEnv)
  }
  return null
}
