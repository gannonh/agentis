import type { AgentToolGrantInput } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

export type ResolvedAgentToolGrant = {
  toolkitSlug: string
  connectionId: string
}

type GrantResolutionError =
  | "duplicate_toolkit_grant"
  | "toolkit_connection_mismatch"
  | "toolkit_not_connected"

type GrantResolutionResult =
  | { grants: ResolvedAgentToolGrant[] }
  | { error: GrantResolutionError }

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

export function toolkitGrantRemediation(
  error: string | undefined
): string | undefined {
  if (error !== "toolkit_not_connected") return undefined
  return "Connect the toolkit from Integrations before granting it to an agent."
}
