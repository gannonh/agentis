import type {
  ConnectionStatus,
  IntegrationConnection,
  IntegrationToolkit,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { isComposioAvailable } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import { FEATURED_TOOLKIT_SLUGS } from "../repositories/integration-seeds.js"
import type { ComposioClientAdapter } from "./types.js"
import { listAvailableToolsForToolkit } from "./tool-catalog.js"
import { toAppToolkitSlug } from "./toolkit-slugs.js"

function aggregateToolkitStatus(
  connections: IntegrationConnection[]
): ConnectionStatus {
  if (connections.length === 0) return "not_connected"
  if (connections.some((c) => c.status === "connected")) return "connected"
  if (connections.some((c) => c.status === "pending")) return "pending"
  if (connections.some((c) => c.status === "expired")) return "expired"
  if (connections.some((c) => c.status === "error")) return "error"
  return "not_connected"
}

export class IntegrationService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly composio: ComposioClientAdapter
  ) {}

  listFeaturedToolkits(): IntegrationToolkit[] {
    this.repos.integrationToolkits.seedFeatured()
    const rows = this.repos.integrationToolkits.listFeatured()
    const connections = this.repos.integrationConnections.listByUserId()

    return rows.map((row) => {
      const toolkitConnections = connections.filter(
        (connection) => connection.toolkitSlug === row.slug
      )
      const status = aggregateToolkitStatus(toolkitConnections)
      const connectedAccountCount = toolkitConnections.filter(
        (connection) => connection.status === "connected"
      ).length
      return this.repos.integrationToolkits.toIntegrationToolkit(
        row,
        status,
        connectedAccountCount,
        listAvailableToolsForToolkit(row.slug)
      )
    })
  }

  async startConnection(toolkitSlug: string) {
    if (!FEATURED_TOOLKIT_SLUGS.includes(toolkitSlug as (typeof FEATURED_TOOLKIT_SLUGS)[number])) {
      throw new Error("Unsupported toolkit")
    }
    if (!isComposioAvailable(this.config)) {
      throw new Error("composio_not_configured")
    }

    const redirectBase =
      this.config.composioRedirectBaseUrl ?? "http://127.0.0.1:3001"
    const callbackUrl = `${redirectBase}/api/integrations/callback?toolkitSlug=${encodeURIComponent(toolkitSlug)}`
    const existing = this.repos.integrationConnections.getByToolkitSlug(toolkitSlug)
    if (existing?.status === "connected") {
      throw new Error("toolkit_already_connected")
    }

    const authorize = await this.composio.authorizeToolkit(
      this.config.composioUserId,
      toolkitSlug,
      callbackUrl
    )

    const connection =
      existing ??
      this.repos.integrationConnections.create({
        toolkitSlug,
        status: "pending",
        composioConnectionRequestId: authorize.connectionRequestId,
        composioConnectedAccountId: authorize.connectedAccountId,
      })

    const updated = this.repos.integrationConnections.update(connection.id, {
      status: "pending",
      composioConnectionRequestId: authorize.connectionRequestId,
      composioConnectedAccountId:
        authorize.connectedAccountId ??
        connection.composioConnectedAccountId ??
        undefined,
    })

    return {
      connection: updated!,
      redirectUrl: authorize.redirectUrl,
    }
  }

  async completeCallback(input: {
    connectionRequestId?: string
    toolkitSlug?: string
    connectedAccountId?: string
    status?: string
    mock?: boolean
  }) {
    let connection =
      input.connectionRequestId
        ? this.repos.integrationConnections.getByConnectionRequestId(
            input.connectionRequestId
          )
        : null

    if (!connection && input.toolkitSlug) {
      connection = this.repos.integrationConnections.getByToolkitSlug(
        input.toolkitSlug
      )
    }

    if (!connection) {
      throw new Error("unknown_connection")
    }

    if (input.status === "failed") {
      const updated = this.repos.integrationConnections.update(connection.id, {
        status: "error",
        errorCode: "connection_failed",
        errorMessage: "Composio reported that authentication failed",
      })
      return updated!
    }

    const accountId =
      input.connectedAccountId ?? connection.composioConnectedAccountId
    if (!accountId) {
      const updated = this.repos.integrationConnections.update(connection.id, {
        status: "error",
        errorCode: "missing_connected_account",
        errorMessage: "Composio did not return a connected account id",
      })
      return updated!
    }

    let refreshed
    try {
      refreshed = await this.composio.refreshConnectedAccount(accountId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh connected account"
      const failed = this.repos.integrationConnections.update(connection.id, {
        status: "error",
        errorCode: "connection_error",
        errorMessage: message,
      })
      return failed!
    }

    const refreshedToolkitSlug = toAppToolkitSlug(refreshed.toolkitSlug)
    if (refreshedToolkitSlug !== connection.toolkitSlug) {
      this.repos.integrationConnections.update(connection.id, {
        status: "error",
        errorCode: "toolkit_connection_mismatch",
        errorMessage: `Composio returned a ${refreshedToolkitSlug} account for ${connection.toolkitSlug}.`,
      })
      throw new Error("toolkit_connection_mismatch")
    }

    const updated = this.repos.integrationConnections.update(connection.id, {
      status: refreshed.status,
      composioConnectedAccountId: refreshed.id,
      accountLabel: refreshed.accountLabel,
      scopes: refreshed.scopes,
      errorCode: refreshed.status === "error" ? "connection_error" : null,
      errorMessage: null,
    })
    return updated!
  }

  resetConnection(toolkitSlug: string): boolean {
    if (
      !FEATURED_TOOLKIT_SLUGS.includes(
        toolkitSlug as (typeof FEATURED_TOOLKIT_SLUGS)[number]
      )
    ) {
      throw new Error("Unsupported toolkit")
    }
    return this.repos.integrationConnections.deleteByToolkitSlug(toolkitSlug)
  }

  async refreshAllConnections() {
    const connections = this.repos.integrationConnections.listByUserId()
    for (const connection of connections) {
      if (!connection.composioConnectedAccountId) continue
      try {
        const refreshed = await this.composio.refreshConnectedAccount(
          connection.composioConnectedAccountId
        )
        this.repos.integrationConnections.update(connection.id, {
          status: refreshed.status,
          accountLabel: refreshed.accountLabel,
          scopes: refreshed.scopes,
          errorCode: refreshed.status === "error" ? "connection_error" : null,
          errorMessage: null,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to refresh connection"
        this.repos.integrationConnections.update(connection.id, {
          status: "error",
          errorCode: "refresh_failed",
          errorMessage: message,
        })
      }
    }
    return this.listFeaturedToolkits()
  }
}
