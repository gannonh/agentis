import type {
  ConnectionStatus,
  IntegrationConnection,
  IntegrationToolkit,
  IntegrationsListQuery,
  IntegrationsListResponse,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { isComposioAvailable } from "../config.js"
import type { Repositories } from "../repositories/index.js"
import type {
  ComposioClientAdapter,
  ComposioConnectedAccount,
  ComposioToolkitSummary,
} from "./types.js"
import { listAvailableToolsForToolkit } from "./tool-catalog.js"
import { toAppToolkitSlug } from "./toolkit-slugs.js"

const CONNECTION_STATUS_PRIORITY: Record<ConnectionStatus, number> = {
  connected: 0,
  pending: 1,
  expired: 2,
  error: 3,
  not_connected: 4,
}

const CATALOG_LIMIT = 20

type ListIntegrationsResult = Pick<
  IntegrationsListResponse,
  "toolkits" | "categories"
>

function groupConnectionsByToolkitSlug(
  connections: IntegrationConnection[]
): Map<string, IntegrationConnection[]> {
  const grouped = new Map<string, IntegrationConnection[]>()
  for (const connection of connections) {
    const toolkitConnections = grouped.get(connection.toolkitSlug) ?? []
    toolkitConnections.push(connection)
    grouped.set(connection.toolkitSlug, toolkitConnections)
  }
  return grouped
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

function aggregateToolkitStatus(
  connections: IntegrationConnection[]
): ConnectionStatus {
  if (connections.length === 0) return "not_connected"

  let best: ConnectionStatus = "not_connected"
  for (const connection of connections) {
    if (
      CONNECTION_STATUS_PRIORITY[connection.status] <
      CONNECTION_STATUS_PRIORITY[best]
    ) {
      best = connection.status
    }
  }
  return best
}

function uniqueToolkitSlugs(
  connections: IntegrationConnection[],
  predicate: (connection: IntegrationConnection) => boolean
): string[] {
  return [
    ...new Set(
      connections.filter(predicate).map((connection) => connection.toolkitSlug)
    ),
  ]
}

function optionalTrim(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

export class IntegrationService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly composio: ComposioClientAdapter
  ) {}

  private buildIntegrationToolkit(
    summary: ComposioToolkitSummary,
    toolkitConnections: IntegrationConnection[]
  ): IntegrationToolkit {
    const connectedAccountCount = toolkitConnections.filter(
      (connection) => connection.status === "connected"
    ).length
    const status = aggregateToolkitStatus(toolkitConnections)

    return {
      slug: summary.slug,
      name: summary.name,
      description: summary.description,
      category: summary.category,
      featured: summary.featured,
      integrationType: summary.integrationType,
      logoUrl: summary.logoUrl,
      status,
      connectedAccountCount,
      availableTools: listAvailableToolsForToolkit(summary.slug),
    }
  }

  private async resolveToolkitSummary(
    slug: string
  ): Promise<ComposioToolkitSummary | null> {
    const fromComposio = await this.composio.getToolkit(slug)
    if (fromComposio) return fromComposio

    const row = this.repos.integrationToolkits.getBySlug(slug)
    if (!row) return null

    return {
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      featured: row.featured,
      integrationType: "native",
    }
  }

  private async buildToolkitsForSlugs(
    slugs: string[],
    connectionsBySlug: Map<string, IntegrationConnection[]>
  ): Promise<IntegrationToolkit[]> {
    const resolvedSummaries = await Promise.all(
      slugs.map((slug) => this.resolveToolkitSummary(slug))
    )

    return resolvedSummaries
      .filter((summary): summary is ComposioToolkitSummary => summary !== null)
      .map((summary) =>
        this.buildIntegrationToolkit(
          summary,
          connectionsBySlug.get(summary.slug) ?? []
        )
      )
  }

  async listToolkits(input: IntegrationsListQuery = {}): Promise<ListIntegrationsResult> {
    if (!isComposioAvailable(this.config) && !this.config.mockComposio) {
      return { toolkits: [], categories: [] }
    }

    const search = optionalTrim(input.q)
    const category = optionalTrim(input.category)
    const featured = input.featured ?? (!search && !category)

    const [catalogResult, categories] = await Promise.all([
      this.composio.listToolkits({
        search,
        category,
        featured,
        limit: CATALOG_LIMIT,
      }),
      this.composio.listToolkitCategories(),
    ])

    const connections = this.repos.integrationConnections.listByUserId()
    const connectionsBySlug = groupConnectionsByToolkitSlug(connections)
    const toolkits = catalogResult.items.map((summary) =>
      this.buildIntegrationToolkit(
        summary,
        connectionsBySlug.get(summary.slug) ?? []
      )
    )
    const toolkitSlugs = new Set(toolkits.map((toolkit) => toolkit.slug))

    const connectedSlugs = uniqueToolkitSlugs(
      connections,
      (connection) => connection.status !== "not_connected"
    )

    const missingActiveSlugs = connectedSlugs.filter((slug) => !toolkitSlugs.has(slug))
    const additionalToolkits = await this.buildToolkitsForSlugs(
      missingActiveSlugs,
      connectionsBySlug
    )
    toolkits.push(...additionalToolkits)

    return { toolkits, categories }
  }

  async listConnectedToolkits(): Promise<IntegrationToolkit[]> {
    const connections = this.repos.integrationConnections.listByUserId()
    const connectionsBySlug = groupConnectionsByToolkitSlug(connections)
    const connectedSlugs = uniqueToolkitSlugs(
      connections,
      (connection) => connection.status === "connected"
    )
    return this.buildToolkitsForSlugs(connectedSlugs, connectionsBySlug)
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

  async refreshAllConnections() {
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

    const result = await this.listToolkits()
    return result.toolkits
  }
}
