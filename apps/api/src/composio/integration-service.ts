import type {
  ConnectionStatus,
  IntegrationConnection,
  IntegrationToolkit,
  IntegrationsListQuery,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { isComposioAvailable } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import type {
  ComposioClientAdapter,
  ComposioConnectedAccount,
} from "./types.js"
import { IntegrationCatalog } from "./integration-catalog.js"
import { toAppToolkitSlug } from "./toolkit-slugs.js"

const CONNECTION_STATUS_PRIORITY: Record<ConnectionStatus, number> = {
  connected: 0,
  pending: 1,
  expired: 2,
  error: 3,
  not_connected: 4,
}

function pickPreferredRemoteAccount(
  accounts: ComposioConnectedAccount[]
): ComposioConnectedAccount | null {
  if (accounts.length === 0) return null
  return [...accounts].sort(
    (left, right) =>
      CONNECTION_STATUS_PRIORITY[left.status] -
      CONNECTION_STATUS_PRIORITY[right.status]
  )[0]!
}

function pickRemoteAccountForConnection(
  existing: IntegrationConnection | null,
  accounts: ComposioConnectedAccount[]
): ComposioConnectedAccount | null {
  if (accounts.length === 0) return null

  if (existing?.composioConnectedAccountId) {
    const matched = accounts.find(
      (account) => account.id === existing.composioConnectedAccountId
    )
    if (matched) return matched
  }

  return pickPreferredRemoteAccount(accounts)
}

export class IntegrationService {
  private readonly catalog: IntegrationCatalog

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly composio: ComposioClientAdapter
  ) {
    this.catalog = new IntegrationCatalog(repos, composio)
  }

  private async ensureToolkitCatalogRow(toolkitSlug: string): Promise<boolean> {
    try {
      const toolkit = await this.composio.getToolkit(toolkitSlug)
      if (toolkit) {
        this.repos.integrationToolkits.upsertFromCatalog(toolkit)
        return true
      }
    } catch {
      // Keep refresh resilient to retired toolkits or transient per-toolkit lookups.
    }

    return Boolean(this.repos.integrationToolkits.getBySlug(toolkitSlug))
  }

  async listToolkits(input: IntegrationsListQuery = {}) {
    if (!isComposioAvailable(this.config) && !this.config.mockComposio) {
      return { toolkits: [], categories: [] }
    }
    return this.catalog.list(input)
  }

  async listConnectedToolkits(): Promise<IntegrationToolkit[]> {
    return this.catalog.listConnected()
  }

  async startConnection(toolkitSlug: string) {
    const toolkit = await this.composio.getToolkit(toolkitSlug)
    if (!toolkit) {
      throw new Error("Unsupported toolkit")
    }
    if (!isComposioAvailable(this.config)) {
      throw new Error("composio_not_configured")
    }

    this.repos.integrationToolkits.upsertFromCatalog(toolkit)

    const redirectBase =
      this.config.composioRedirectBaseUrl ??
      `http://127.0.0.1:${this.config.port}`
    const callbackUrl = `${redirectBase}/api/integrations/callback?toolkitSlug=${encodeURIComponent(toolkitSlug)}`
    const existing =
      this.repos.integrationConnections.getByToolkitSlug(toolkitSlug)
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
    let connection = input.connectionRequestId
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
        error instanceof Error
          ? error.message
          : "Failed to refresh connected account"
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
    return this.repos.integrationConnections.deleteByToolkitSlug(toolkitSlug)
  }

  async refreshAllConnections(input: IntegrationsListQuery = {}) {
    const remoteAccounts = await this.composio.listConnectedAccounts(
      this.config.composioUserId
    )
    const connections = this.repos.integrationConnections.listByUserId()
    const toolkitSlugs = new Set([
      ...connections.map((connection) => connection.toolkitSlug),
      ...remoteAccounts.map((account) => account.toolkitSlug),
    ])

    for (const toolkitSlug of toolkitSlugs) {
      const remoteForToolkit = remoteAccounts.filter(
        (account) => account.toolkitSlug === toolkitSlug
      )
      const existing =
        this.repos.integrationConnections.getByToolkitSlug(toolkitSlug)
      const remote = pickRemoteAccountForConnection(existing, remoteForToolkit)
      if (!remote) continue

      if (existing) {
        const matchedRemote = existing.composioConnectedAccountId
          ? remoteForToolkit.find(
              (account) => account.id === existing.composioConnectedAccountId
            )
          : undefined
        const remoteToSync = matchedRemote ?? remote

        if (
          existing.composioConnectedAccountId &&
          !matchedRemote &&
          this.repos.toolAccessGrants.hasAnyForConnection(existing.id)
        ) {
          this.repos.integrationConnections.update(existing.id, {
            status: "expired",
            errorCode: "connection_expired",
            errorMessage:
              "The connected Composio account is no longer available. Reconnect from Integrations and re-grant access.",
          })
          continue
        }

        this.repos.integrationConnections.update(existing.id, {
          status: remoteToSync.status,
          composioConnectedAccountId: remoteToSync.id,
          accountLabel: remoteToSync.accountLabel,
          scopes: remoteToSync.scopes,
          errorCode: remoteToSync.status === "error" ? "connection_error" : null,
          errorMessage: null,
        })
        continue
      }

      const hasCatalogRow = await this.ensureToolkitCatalogRow(toolkitSlug)
      if (!hasCatalogRow) continue

      this.repos.integrationConnections.create({
        toolkitSlug,
        status: remote.status,
        composioConnectedAccountId: remote.id,
        accountLabel: remote.accountLabel,
        scopes: remote.scopes,
      })
    }

    const remoteAccountIds = new Set(remoteAccounts.map((account) => account.id))
    for (const connection of connections) {
      if (!connection.composioConnectedAccountId) continue
      if (
        connection.status === "expired" ||
        !remoteAccountIds.has(connection.composioConnectedAccountId)
      ) {
        continue
      }
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
          error instanceof Error
            ? error.message
            : "Failed to refresh connection"
        this.repos.integrationConnections.update(connection.id, {
          status: "error",
          errorCode: "refresh_failed",
          errorMessage: message,
        })
      }
    }

    return this.catalog.list(input)
  }
}
