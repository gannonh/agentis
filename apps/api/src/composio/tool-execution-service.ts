import { tool } from "ai"
import { z } from "zod"
import type { ConnectionStatus } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import {
  CURATED_COMPOSIO_TOOLS,
  getCuratedToolSlug,
  SUPPORTED_TOOLKIT_NAMES,
} from "./tool-catalog.js"
import { summarizeToolOutput } from "./sanitize.js"
import type { ComposioClientAdapter } from "./types.js"

export class ComposioRemediationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "composio_not_configured"
      | "toolkit_not_connected"
      | "toolkit_not_granted"
      | "connection_pending"
      | "connection_expired"
      | "tool_execution_failed",
    public readonly toolkitSlug?: string
  ) {
    super(message)
    this.name = "ComposioRemediationError"
  }
}

function detectExplicitToolkitIntent(
  prompt: string
): string | null {
  const normalized = prompt.toLowerCase()
  for (const [slug, name] of Object.entries(SUPPORTED_TOOLKIT_NAMES)) {
    if (
      normalized.includes(slug) ||
      normalized.includes(name.toLowerCase())
    ) {
      return slug
    }
  }
  return null
}

export class ToolExecutionService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly composio: ComposioClientAdapter
  ) {}

  checkPreflightRemediation(prompt: string, threadId: string) {
    const toolkitSlug = detectExplicitToolkitIntent(prompt)
    if (!toolkitSlug) return null

    const connection = this.repos.integrationConnections.getByToolkitSlug(
      toolkitSlug
    )
    const grant = this.repos.toolAccessGrants.getByScopeAndToolkit(
      "thread",
      threadId,
      toolkitSlug
    )

    if (!connection || connection.status === "not_connected") {
      return new ComposioRemediationError(
        `${SUPPORTED_TOOLKIT_NAMES[toolkitSlug]} is not connected. Connect it from Integrations, then grant it to this thread.`,
        "toolkit_not_connected",
        toolkitSlug
      )
    }

    if (connection.status === "pending") {
      return new ComposioRemediationError(
        `${SUPPORTED_TOOLKIT_NAMES[toolkitSlug]} connection is still pending. Finish OAuth on the Integrations page.`,
        "connection_pending",
        toolkitSlug
      )
    }

    if (connection.status === "expired") {
      return new ComposioRemediationError(
        `${SUPPORTED_TOOLKIT_NAMES[toolkitSlug]} connection expired. Re-connect from Integrations.`,
        "connection_expired",
        toolkitSlug
      )
    }

    if (!grant) {
      return new ComposioRemediationError(
        `${SUPPORTED_TOOLKIT_NAMES[toolkitSlug]} is connected but not granted to this thread. Enable it in the composer Tools menu.`,
        "toolkit_not_granted",
        toolkitSlug
      )
    }

    return null
  }

  buildRuntimeTools(threadId: string) {
    const grants = this.repos.toolAccessGrants.listByScope("thread", threadId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {}

    for (const grant of grants) {
      const connection = this.repos.integrationConnections.getById(
        grant.connectionId
      )
      if (!connection || connection.status !== "connected") continue

      const curated = CURATED_COMPOSIO_TOOLS[grant.toolkitSlug]
      const toolSlug = getCuratedToolSlug(grant.toolkitSlug)
      if (!curated || !toolSlug) continue

      const aiToolName = `composio_${grant.toolkitSlug.replace(/-/g, "_")}`
      tools[aiToolName] = tool({
        description: curated.description,
        inputSchema: z.object({
          note: z
            .string()
            .optional()
            .describe("Optional note about what to fetch"),
        }),
        execute: async () => {
          this.assertCanExecute(grant.toolkitSlug, threadId, connection.id)
          const version =
            this.config.composioToolkitVersions[grant.toolkitSlug]
          const result = await this.composio.executeTool({
            toolSlug,
            userId: this.config.composioUserId,
            connectedAccountId: connection.composioConnectedAccountId!,
            arguments: {},
            version,
          })
          if (result.error) {
            throw new ComposioRemediationError(
              result.error,
              "tool_execution_failed",
              grant.toolkitSlug
            )
          }
          return summarizeToolOutput(result.data)
        },
      })
    }

    return tools
  }

  private assertCanExecute(
    toolkitSlug: string,
    threadId: string,
    connectionId: string
  ) {
    const grant = this.repos.toolAccessGrants.getByScopeAndToolkit(
      "thread",
      threadId,
      toolkitSlug
    )
    if (!grant || grant.connectionId !== connectionId) {
      throw new ComposioRemediationError(
        `${SUPPORTED_TOOLKIT_NAMES[toolkitSlug]} is not granted to this thread.`,
        "toolkit_not_granted",
        toolkitSlug
      )
    }
    const connection = this.repos.integrationConnections.getById(connectionId)
    if (!connection || connection.status !== "connected") {
      throw new ComposioRemediationError(
        `${SUPPORTED_TOOLKIT_NAMES[toolkitSlug]} is not connected.`,
        "toolkit_not_connected",
        toolkitSlug
      )
    }
  }

  formatRunStepPayload(input: {
    toolkitSlug: string
    toolSlug: string
    connectedAccountId?: string
    toolInput?: unknown
    toolOutput?: unknown
    durationMs?: number
    error?: string
    remediation?: string
  }) {
    return {
      provider: "composio",
      toolkitSlug: input.toolkitSlug,
      toolSlug: input.toolSlug,
      connectedAccountId: input.connectedAccountId,
      input:
        input.toolInput !== undefined
          ? summarizeToolOutput(input.toolInput)
          : undefined,
      output:
        input.toolOutput !== undefined
          ? summarizeToolOutput(input.toolOutput)
          : undefined,
      durationMs: input.durationMs,
      error: input.error,
      remediation: input.remediation,
    }
  }
}

export function mapConnectionToToolkitStatus(
  status: ConnectionStatus
): ConnectionStatus {
  return status
}
