import type {
  ConnectionStatus,
  IntegrationConnection,
  IntegrationToolkit,
  IntegrationsListQuery,
  IntegrationsListResponse,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"
import type { ComposioClientAdapter, ComposioToolkitSummary } from "./types.js"
import { listAvailableToolsForToolkit } from "./tool-catalog.js"

const CATALOG_LIMIT = 20

export type IntegrationCatalogResult = Pick<
  IntegrationsListResponse,
  "toolkits" | "categories"
>

const CONNECTION_STATUS_PRIORITY: Record<ConnectionStatus, number> = {
  connected: 0,
  pending: 1,
  expired: 2,
  error: 3,
  not_connected: 4,
}

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

function buildIntegrationToolkit(
  summary: ComposioToolkitSummary,
  toolkitConnections: IntegrationConnection[]
): IntegrationToolkit {
  const connectedAccountCount = toolkitConnections.filter(
    (connection) => connection.status === "connected"
  ).length

  return {
    slug: summary.slug,
    name: summary.name,
    description: summary.description,
    category: summary.category,
    featured: summary.featured,
    integrationType: summary.integrationType,
    logoUrl: summary.logoUrl,
    status: aggregateToolkitStatus(toolkitConnections),
    connectedAccountCount,
    availableTools: listAvailableToolsForToolkit(summary.slug),
  }
}

export function mergeCatalogWithActiveConnections(
  catalogToolkits: IntegrationToolkit[],
  activeSlugs: string[],
  resolveAdditional: (slug: string) => IntegrationToolkit | undefined
): IntegrationToolkit[] {
  const merged = [...catalogToolkits]
  const toolkitSlugs = new Set(merged.map((toolkit) => toolkit.slug))

  for (const slug of activeSlugs) {
    if (toolkitSlugs.has(slug)) continue
    const toolkit = resolveAdditional(slug)
    if (!toolkit) continue
    merged.push(toolkit)
    toolkitSlugs.add(slug)
  }

  return merged
}

export class IntegrationCatalog {
  constructor(
    private readonly repos: Repositories,
    private readonly composio: ComposioClientAdapter
  ) {}

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
        buildIntegrationToolkit(
          summary,
          connectionsBySlug.get(summary.slug) ?? []
        )
      )
  }

  async list(input: IntegrationsListQuery = {}): Promise<IntegrationCatalogResult> {
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

    const catalogToolkits = catalogResult.items.map((summary) =>
      buildIntegrationToolkit(summary, connectionsBySlug.get(summary.slug) ?? [])
    )

    const activeSlugs = uniqueToolkitSlugs(
      connections,
      (connection) => connection.status !== "not_connected"
    )

    const missingActiveSlugs = activeSlugs.filter(
      (slug) => !catalogToolkits.some((toolkit) => toolkit.slug === slug)
    )
    const additionalBySlug = new Map(
      (await this.buildToolkitsForSlugs(missingActiveSlugs, connectionsBySlug)).map(
        (toolkit) => [toolkit.slug, toolkit] as const
      )
    )

    const toolkits = mergeCatalogWithActiveConnections(
      catalogToolkits,
      activeSlugs,
      (slug) => additionalBySlug.get(slug)
    )

    return { toolkits, categories }
  }

  async listConnected(): Promise<IntegrationToolkit[]> {
    const connections = this.repos.integrationConnections.listByUserId()
    const connectionsBySlug = groupConnectionsByToolkitSlug(connections)
    const connectedSlugs = uniqueToolkitSlugs(
      connections,
      (connection) => connection.status === "connected"
    )
    return this.buildToolkitsForSlugs(connectedSlugs, connectionsBySlug)
  }
}
