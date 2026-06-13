import { eq } from "drizzle-orm"
import type { IntegrationToolkit } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { integrationToolkits } from "../db/schema.js"
import { nowIso } from "../lib/ids.js"
import type { ComposioToolkitSummary } from "../composio/types.js"
import {
  MOCK_COMPOSIO_TOOLKITS,
} from "./integration-seeds.js"

type ToolkitRow = typeof integrationToolkits.$inferSelect

function mapToolkitRow(
  row: ToolkitRow,
  status: IntegrationToolkit["status"],
  connectedAccountCount: number,
  availableTools: string[],
  integrationType: IntegrationToolkit["integrationType"] = "native",
  logoUrl?: string
): IntegrationToolkit {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    featured: row.featured,
    integrationType,
    logoUrl,
    status,
    connectedAccountCount,
    availableTools,
  }
}

export class IntegrationToolkitRepository {
  constructor(private readonly db: AppDatabase) {}

  upsertFromCatalog(toolkit: ComposioToolkitSummary) {
    const now = nowIso()
    this.db
      .insert(integrationToolkits)
      .values({
        slug: toolkit.slug,
        name: toolkit.name,
        description: toolkit.description,
        category: toolkit.category,
        featured: toolkit.featured,
        authConfigId: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: integrationToolkits.slug,
        set: {
          name: toolkit.name,
          description: toolkit.description,
          category: toolkit.category,
          featured: toolkit.featured,
          updatedAt: now,
        },
      })
      .run()
  }

  seedFeatured() {
    for (const toolkit of MOCK_COMPOSIO_TOOLKITS.filter((item) => item.featured)) {
      this.upsertFromCatalog(toolkit)
    }
  }

  listFeatured(): typeof integrationToolkits.$inferSelect[] {
    return this.db
      .select()
      .from(integrationToolkits)
      .where(eq(integrationToolkits.featured, true))
      .all()
  }

  getBySlug(slug: string) {
    return this.db
      .select()
      .from(integrationToolkits)
      .where(eq(integrationToolkits.slug, slug))
      .get()
  }

  toIntegrationToolkit(
    row: ToolkitRow,
    status: IntegrationToolkit["status"],
    connectedAccountCount: number,
    availableTools: string[],
    integrationType: IntegrationToolkit["integrationType"] = "native",
    logoUrl?: string
  ): IntegrationToolkit {
    return mapToolkitRow(
      row,
      status,
      connectedAccountCount,
      availableTools,
      integrationType,
      logoUrl
    )
  }
}
