import { Composio } from "@composio/core"
import type { ConnectionStatus } from "@workspace/shared"
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
import {
  mapComposioAccountStatus,
  mapComposioToolkitSummary,
} from "./mock-composio-client.js"
import { toAppToolkitSlug, toComposioToolkitSlug } from "./toolkit-slugs.js"

function mapConnectionStatus(status: string): ConnectionStatus {
  return mapComposioAccountStatus(status)
}

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

type ComposioToolkitListItem = {
  slug?: string
  name?: string
  description?: string
  logo?: string
  categories?: Array<string | { slug?: string; name?: string }>
  managedBy?: string
  meta?: {
    description?: string
    logo?: string
    categories?: Array<string | { slug?: string; name?: string }>
  }
}

type ComposioToolkitListResponse = {
  items: ComposioToolkitListItem[]
  nextCursor?: string | null
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

function matchesSearch(toolkit: ComposioToolkitSummary, search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true
  return (
    toolkit.name.toLowerCase().includes(normalized) ||
    toolkit.description.toLowerCase().includes(normalized) ||
    toolkit.slug.toLowerCase().includes(normalized) ||
    toolkit.category.toLowerCase().includes(normalized)
  )
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
    const toolkitSlug = toAppToolkitSlug(account.toolkit?.slug ?? "unknown")
    const accountRecord = account as {
      member?: { email?: string; name?: string }
      scopes?: string[]
    }
    return {
      id: account.id,
      toolkitSlug,
      status: mapConnectionStatus(account.status),
      accountLabel:
        accountRecord.member?.email ?? accountRecord.member?.name ?? undefined,
      scopes: accountRecord.scopes,
    }
  }

  async listConnectedAccounts(userId: string): Promise<ComposioConnectedAccount[]> {
    const response = await this.composio.connectedAccounts.list({ userIds: [userId] })
    return response.items.map((account) => {
      const accountRecord = account as {
        member?: { email?: string; name?: string }
        scopes?: string[]
      }
      return {
        id: account.id,
        toolkitSlug: toAppToolkitSlug(account.toolkit?.slug ?? "unknown"),
        status: mapConnectionStatus(account.status),
        accountLabel:
          accountRecord.member?.email ??
          accountRecord.member?.name ??
          undefined,
        scopes: accountRecord.scopes,
      }
    })
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
    const response = await this.composio.toolkits.get({
      category: input.category,
      sortBy: featured ? "usage" : "alphabetically",
      managedBy: featured ? "composio" : "all",
      limit: input.limit ?? 20,
      cursor: input.cursor,
    })

    if (!isToolkitListResponse(response)) {
      return { items: [] }
    }

    const items = response.items
      .map((toolkit) => mapComposioToolkitSummary(toolkit, featured))
      .filter((toolkit): toolkit is ComposioToolkitSummary => toolkit !== null)
      .filter((toolkit) =>
        input.search ? matchesSearch(toolkit, input.search) : true
      )

    return {
      items,
      nextCursor: response.nextCursor ?? undefined,
    }
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
      .map((category) => category.name)
      .filter((value): value is string => Boolean(value))
      .sort()
  }
}

import { MockComposioClient } from "./mock-composio-client.js"

export function createComposioClient(config: AppConfig): ComposioClientAdapter {
  if (config.mockComposio) {
    return new MockComposioClient()
  }
  return new LiveComposioClient(config)
}
