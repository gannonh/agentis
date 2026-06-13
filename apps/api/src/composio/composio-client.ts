import { Composio } from "@composio/core"
import type { AppConfig } from "../config.js"
import type {
  ComposioAuthorizeResult,
  ComposioClientAdapter,
  ComposioConnectedAccount,
  ComposioListToolkitsInput,
  ComposioListToolkitsResult,
  ComposioToolExecuteInput,
  ComposioToolExecuteResult,
  ComposioToolkitSummary,
} from "./types.js"
import { MockComposioClient } from "./mock-composio-client.js"
import { normalizeToolkitCategoryValue, toComposioCategoryQuery } from "./category-normalize.js"
import { mapComposioAccountStatus } from "./composio-account-status.js"
import {
  mapComposioToolkitSummary,
  matchesToolkitCatalogSearch,
  type ComposioToolkitResponse,
} from "./toolkit-catalog-map.js"
import { toAppToolkitSlug, toComposioToolkitSlug } from "./toolkit-slugs.js"

type AuthConfigLookupClient = {
  authConfigs: {
    list(query: { toolkit: string }): Promise<{ items: unknown[] }>
    create(
      toolkit: string,
      input: { type: "use_composio_managed_auth"; name: string }
    ): Promise<{ id: string }>
  }
  toolkits: {
    get(toolkit: string): Promise<{
      name: string
      authConfigDetails?: unknown[]
    }>
  }
}

type ListedAuthConfig = {
  id: string
  toolkit?: { slug?: string } | string
  toolkitSlug?: string
}

type ComposioToolkitListResponse = {
  items: ComposioToolkitResponse[]
  nextCursor?: string | null
}

type ComposioAccountRecord = {
  id: string
  status: string
  toolkit?: { slug?: string }
  member?: { email?: string; name?: string }
  scopes?: string[]
}

function mapComposioConnectedAccount(
  account: ComposioAccountRecord
): ComposioConnectedAccount {
  return {
    id: account.id,
    toolkitSlug: toAppToolkitSlug(account.toolkit?.slug ?? "unknown"),
    status: mapComposioAccountStatus(account.status),
    accountLabel: account.member?.email ?? account.member?.name ?? undefined,
    scopes: account.scopes,
  }
}

function getAuthConfigToolkitSlug(authConfig: ListedAuthConfig) {
  if (typeof authConfig.toolkit === "string") return authConfig.toolkit
  return authConfig.toolkit?.slug ?? authConfig.toolkitSlug
}

function isToolkitListResponse(value: unknown): value is ComposioToolkitListResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as ComposioToolkitListResponse).items)
  )
}

function mapToolkitListPage(
  response: unknown,
  featured: boolean
): { items: ComposioToolkitSummary[]; nextCursor?: string } | null {
  const responseItems = Array.isArray(response)
    ? response
    : isToolkitListResponse(response)
      ? response.items
      : null
  if (!responseItems) return null

  const items = responseItems
    .map((toolkit) => mapComposioToolkitSummary(toolkit, featured))
    .filter((toolkit): toolkit is ComposioToolkitSummary => toolkit !== null)

  return {
    items,
    nextCursor:
      !Array.isArray(response) && isToolkitListResponse(response)
        ? response.nextCursor ?? undefined
        : undefined,
  }
}

function buildToolkitListQuery(
  input: ComposioListToolkitsInput,
  featured: boolean,
  limit: number,
  cursor?: string
) {
  return {
    category: input.category ? toComposioCategoryQuery(input.category) : undefined,
    sortBy: featured ? ("usage" as const) : ("alphabetically" as const),
    managedBy: featured ? ("composio" as const) : ("all" as const),
    limit,
    cursor,
  }
}

const CATALOG_SEARCH_MAX_PAGES = 25
const CATALOG_SEARCH_PAGE_SIZE = 50

async function searchCatalogToolkits(
  composio: Composio,
  input: ComposioListToolkitsInput,
  featured: boolean,
  limit: number,
  search: string
): Promise<ComposioListToolkitsResult> {
  const items: ComposioToolkitSummary[] = []
  let cursor = input.cursor
  let pages = 0

  while (items.length < limit && pages < CATALOG_SEARCH_MAX_PAGES) {
    const response = await composio.toolkits.get(
      buildToolkitListQuery(
        input,
        featured,
        Math.max(limit, CATALOG_SEARCH_PAGE_SIZE),
        cursor
      )
    )

    const page = mapToolkitListPage(response, featured)
    if (!page) break

    for (const summary of page.items) {
      if (!matchesToolkitCatalogSearch(summary, search)) continue
      items.push(summary)
      if (items.length >= limit) break
    }

    cursor = page.nextCursor
    if (!cursor || items.length >= limit) break
    pages++
  }

  return { items: items.slice(0, limit), nextCursor: cursor }
}

export async function resolveAuthConfigId(
  composio: AuthConfigLookupClient,
  toolkitSlug: string
): Promise<string> {
  const composioToolkitSlug = toComposioToolkitSlug(toolkitSlug)
  const listed = await composio.authConfigs.list({ toolkit: composioToolkitSlug })
  const authConfigId = (listed.items as ListedAuthConfig[]).find(
    (authConfig) =>
      toComposioToolkitSlug(getAuthConfigToolkitSlug(authConfig) ?? "") ===
      composioToolkitSlug
  )?.id

  if (authConfigId) return authConfigId

  const toolkit = await composio.toolkits.get(composioToolkitSlug)
  if (!toolkit.authConfigDetails?.length) {
    throw new Error(`No auth configs found for toolkit ${toolkitSlug}`)
  }

  const created = await composio.authConfigs.create(composioToolkitSlug, {
    type: "use_composio_managed_auth",
    name: `${toolkit.name} Auth Config`,
  })
  return created.id
}

export class LiveComposioClient implements ComposioClientAdapter {
  private readonly composio: Composio

  constructor(private readonly config: AppConfig) {
    this.composio = new Composio({
      apiKey: config.composioApiKey!,
      toolkitVersions: config.composioToolkitVersions,
    })
  }

  async authorizeToolkit(
    userId: string,
    toolkitSlug: string,
    callbackUrl: string
  ): Promise<ComposioAuthorizeResult> {
    const callback = new URL(callbackUrl)
    callback.searchParams.set("toolkitSlug", toolkitSlug)

    const authConfigId = await resolveAuthConfigId(
      this.composio as unknown as AuthConfigLookupClient,
      toolkitSlug
    )
    const connectionRequest = await this.composio.connectedAccounts.link(
      userId,
      authConfigId,
      {
        callbackUrl: callback.toString(),
        allowMultiple: true,
      }
    )

    const redirectUrl = connectionRequest.redirectUrl
    if (!redirectUrl) {
      throw new Error("Composio did not return a redirect URL for connection")
    }

    const linked = connectionRequest as {
      id: string
      connectedAccountId?: string
    }

    return {
      connectionRequestId: linked.id,
      redirectUrl,
      connectedAccountId: linked.connectedAccountId ?? linked.id,
    }
  }

  async refreshConnectedAccount(
    connectedAccountId: string
  ): Promise<ComposioConnectedAccount> {
    const account = await this.composio.connectedAccounts.get(connectedAccountId)
    return mapComposioConnectedAccount(account as ComposioAccountRecord)
  }

  async listConnectedAccounts(userId: string): Promise<ComposioConnectedAccount[]> {
    const response = await this.composio.connectedAccounts.list({ userIds: [userId] })
    return response.items.map((account) =>
      mapComposioConnectedAccount(account as ComposioAccountRecord)
    )
  }

  async executeTool(
    input: ComposioToolExecuteInput
  ): Promise<ComposioToolExecuteResult> {
    const started = Date.now()
    try {
      const result = await this.composio.tools.execute(input.toolSlug, {
        userId: input.userId,
        connectedAccountId: input.connectedAccountId,
        arguments: input.arguments,
        version: input.version,
      })
      return {
        data: result.data,
        error: result.error ?? undefined,
        durationMs: Date.now() - started,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Composio tool execution failed"
      return {
        data: undefined,
        error: message,
        durationMs: Date.now() - started,
      }
    }
  }

  async listToolkits(input: ComposioListToolkitsInput): Promise<ComposioListToolkitsResult> {
    const featured = input.featured ?? false
    const limit = input.limit ?? 20
    const search = input.search?.trim()

    if (!search) {
      const response = await this.composio.toolkits.get(
        buildToolkitListQuery(input, featured, limit, input.cursor)
      )
      const page = mapToolkitListPage(response, featured)
      return page ?? { items: [] }
    }

    return searchCatalogToolkits(this.composio, input, featured, limit, search)
  }

  async getToolkit(toolkitSlug: string): Promise<ComposioToolkitSummary | null> {
    const response = await this.composio.toolkits.get(
      toComposioToolkitSlug(toolkitSlug)
    )
    if (isToolkitListResponse(response)) return null
    return mapComposioToolkitSummary(response, false)
  }

  async listToolkitCategories(): Promise<string[]> {
    const response = await this.composio.toolkits.listCategories()
    return response.items
      .map((category) => normalizeToolkitCategoryValue(category))
      .sort()
  }
}

export function createComposioClient(config: AppConfig): ComposioClientAdapter {
  if (config.mockComposio) {
    return new MockComposioClient()
  }
  return new LiveComposioClient(config)
}
