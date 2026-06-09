import type { AgentToolGrantInput } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export type ResolvedAgentToolGrant = {
  toolkitSlug: string
  connectionId: string
}

export type GrantResolutionError =
  | "duplicate_toolkit_grant"
  | "toolkit_connection_mismatch"
  | "toolkit_not_connected"

type GrantResolutionResult =
  | { grants: ResolvedAgentToolGrant[] }
  | { error: GrantResolutionError }

const GRANT_ERROR_MESSAGES: Record<GrantResolutionError, string> = {
  duplicate_toolkit_grant: "Each toolkit can only be granted once.",
  toolkit_connection_mismatch:
    "The selected connection does not match the requested toolkit.",
  toolkit_not_connected:
    "Connect the toolkit from Integrations before granting it.",
}

export function resolveRequestedAgentGrants(
  repos: Repositories,
  requestedGrants: AgentToolGrantInput[]
): GrantResolutionResult {
  const resolvedGrants: ResolvedAgentToolGrant[] = []
  const requestedToolkitSlugs = new Set<string>()

  for (const requested of requestedGrants) {
    if (requestedToolkitSlugs.has(requested.toolkitSlug)) {
      return { error: "duplicate_toolkit_grant" }
    }
    requestedToolkitSlugs.add(requested.toolkitSlug)

    const connection = requested.connectionId
      ? repos.integrationConnections.getById(requested.connectionId)
      : repos.integrationConnections.getByToolkitSlug(requested.toolkitSlug)

    if (
      connection &&
      requested.connectionId &&
      connection.toolkitSlug !== requested.toolkitSlug
    ) {
      return { error: "toolkit_connection_mismatch" }
    }

    if (!connection || connection.status !== "connected") {
      return { error: "toolkit_not_connected" }
    }

    resolvedGrants.push({
      toolkitSlug: requested.toolkitSlug,
      connectionId: connection.id,
    })
  }

  return { grants: resolvedGrants }
}

export function toolkitGrantErrorMessage(error: GrantResolutionError): string {
  return GRANT_ERROR_MESSAGES[error]
}

export function toolkitGrantRemediation(
  error: GrantResolutionError | undefined
): string | undefined {
  if (!error) return undefined
  return toolkitGrantErrorMessage(error)
}
