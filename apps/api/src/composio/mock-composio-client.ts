import type { ConnectionStatus, IntegrationType } from "@workspace/shared"
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
import { CURATED_COMPOSIO_TOOLS } from "./tool-catalog.js"
import {
  MOCK_COMPOSIO_TOOLKITS,
  MOCK_TOOLKIT_CATEGORIES,
} from "../repositories/integration-seeds.js"
import { toAppToolkitSlug } from "./toolkit-slugs.js"

function filterMockToolkits(input: ComposioListToolkitsInput): ComposioToolkitSummary[] {
  const normalizedSearch = input.search?.trim().toLowerCase()
  const featuredOnly = input.featured ?? false

  return MOCK_COMPOSIO_TOOLKITS.filter((toolkit) => {
    if (featuredOnly && !toolkit.featured) return false
    if (input.category && toolkit.category !== input.category) return false
    if (!normalizedSearch) return true
    return (
      toolkit.name.toLowerCase().includes(normalizedSearch) ||
      toolkit.description.toLowerCase().includes(normalizedSearch) ||
      toolkit.slug.toLowerCase().includes(normalizedSearch) ||
      toolkit.category.toLowerCase().includes(normalizedSearch)
    )
  }).map((toolkit) => ({ ...toolkit }))
}

export class MockComposioClient implements ComposioClientAdapter {
  private readonly mockAccounts = new Map<string, ComposioConnectedAccount>()

  async authorizeToolkit(
    userId: string,
    toolkitSlug: string,
    callbackUrl: string
  ): Promise<ComposioAuthorizeResult> {
    const toolkit = await this.getToolkit(toolkitSlug)
    if (!toolkit) {
      throw new Error("Unsupported toolkit")
    }

    const connectionRequestId = `mock-req-${toolkitSlug}-${userId}`
    const connectedAccountId = `mock-acct-${toolkitSlug}-${userId}`
    this.mockAccounts.set(connectedAccountId, {
      id: connectedAccountId,
      toolkitSlug,
      status: "pending",
      accountLabel: `Mock ${toolkitSlug}`,
    })
    const redirect = new URL(callbackUrl)
    redirect.searchParams.set("connectionRequestId", connectionRequestId)
    redirect.searchParams.set("toolkitSlug", toolkitSlug)
    redirect.searchParams.set("mock", "1")
    const redirectUrl = redirect.toString()
    return { connectionRequestId, redirectUrl, connectedAccountId }
  }

  async refreshConnectedAccount(
    connectedAccountId: string
  ): Promise<ComposioConnectedAccount> {
    const existing = this.mockAccounts.get(connectedAccountId)
    if (!existing) {
      return {
        id: connectedAccountId,
        toolkitSlug: "github",
        status: "connected",
        accountLabel: "Mock account",
        scopes: ["repo"],
      }
    }
    const refreshed: ComposioConnectedAccount = {
      ...existing,
      status: "connected",
      scopes: ["repo"],
    }
    this.mockAccounts.set(connectedAccountId, refreshed)
    return refreshed
  }

  async listConnectedAccounts(userId: string): Promise<ComposioConnectedAccount[]> {
    return [...this.mockAccounts.values()].filter(
      (account) => account.id === `mock-acct-${account.toolkitSlug}-${userId}`
    )
  }

  async executeTool(
    input: ComposioToolExecuteInput
  ): Promise<ComposioToolExecuteResult> {
    const started = Date.now()
    const toolkitSlug = Object.entries(CURATED_COMPOSIO_TOOLS).find(
      ([, value]) => value.toolSlug === input.toolSlug
    )?.[0]

    if (input.toolSlug.includes("GITHUB")) {
      return {
        data: {
          repositories: [
            {
              name: "agentis",
              fullName: "composio/agentis",
              private: false,
            },
          ],
          toolkitSlug: toolkitSlug ?? "github",
          mock: true,
        },
        durationMs: Date.now() - started,
      }
    }

    return {
      data: {
        ok: true,
        toolSlug: input.toolSlug,
        toolkitSlug: toolkitSlug ?? "unknown",
        mock: true,
      },
      durationMs: Date.now() - started,
    }
  }

  async listToolkits(input: ComposioListToolkitsInput): Promise<ComposioListToolkitsResult> {
    const limit = input.limit ?? 20
    const items = filterMockToolkits(input).slice(0, limit)
    return { items }
  }

  async getToolkit(toolkitSlug: string): Promise<ComposioToolkitSummary | null> {
    const toolkit = MOCK_COMPOSIO_TOOLKITS.find((item) => item.slug === toolkitSlug)
    return toolkit ? { ...toolkit } : null
  }

  async listToolkitCategories(): Promise<string[]> {
    return [...MOCK_TOOLKIT_CATEGORIES]
  }
}

export function mapComposioAccountStatus(status: string): ConnectionStatus {
  const normalized = status.trim().toUpperCase()
  if (normalized === "ACTIVE") return "connected"
  if (
    normalized === "PENDING" ||
    normalized === "INITIALIZING" ||
    normalized === "INITIATED"
  ) {
    return "pending"
  }
  if (normalized === "EXPIRED") return "expired"
  return "error"
}

function mapIntegrationType(managedBy?: string): IntegrationType {
  return managedBy === "project" ? "mcp" : "native"
}

function normalizeCategory(
  categories?: Array<string | { slug?: string; name?: string }>
): string {
  if (!categories?.length) return "general"
  const first = categories[0]!
  if (typeof first === "string") return first.replace(/-/g, " ")
  return (first.name ?? first.slug ?? "general").replace(/-/g, " ")
}

type ComposioToolkitResponse = {
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

export function mapComposioToolkitSummary(
  toolkit: ComposioToolkitResponse,
  featured = false
): ComposioToolkitSummary | null {
  const slug = toolkit.slug ? toAppToolkitSlug(toolkit.slug) : null
  if (!slug || !toolkit.name) return null

  const description =
    toolkit.description ??
    toolkit.meta?.description ??
    `${toolkit.name} integration`
  const categories = toolkit.categories ?? toolkit.meta?.categories
  const logoUrl = toolkit.logo ?? toolkit.meta?.logo

  return {
    slug,
    name: toolkit.name,
    description,
    category: normalizeCategory(categories),
    featured,
    integrationType: mapIntegrationType(toolkit.managedBy),
    logoUrl: logoUrl || undefined,
  }
}
