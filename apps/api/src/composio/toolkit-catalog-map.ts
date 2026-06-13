import type { ConnectionStatus, IntegrationType } from "@workspace/shared"
import type { ComposioToolkitSummary } from "./types.js"
import {
  normalizeToolkitCategoryList,
  type ToolkitCategoryInput,
} from "./category-normalize.js"
import { toAppToolkitSlug } from "./toolkit-slugs.js"

export function matchesToolkitCatalogSearch(
  toolkit: ComposioToolkitSummary,
  search: string
): boolean {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true
  return (
    toolkit.name.toLowerCase().includes(normalized) ||
    toolkit.description.toLowerCase().includes(normalized) ||
    toolkit.slug.toLowerCase().includes(normalized) ||
    toolkit.category.toLowerCase().includes(normalized)
  )
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

export type ComposioToolkitResponse = {
  slug?: string
  name?: string
  description?: string
  logo?: string
  categories?: ToolkitCategoryInput[]
  managedBy?: string
  meta?: {
    description?: string
    logo?: string
    categories?: ToolkitCategoryInput[]
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
    category: normalizeToolkitCategoryList(categories),
    featured,
    integrationType: mapIntegrationType(toolkit.managedBy),
    logoUrl: logoUrl || undefined,
  }
}
