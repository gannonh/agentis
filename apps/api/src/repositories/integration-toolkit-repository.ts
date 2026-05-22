import { eq } from "drizzle-orm"
import type { IntegrationToolkit } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { integrationToolkits } from "../db/schema.js"
import { nowIso } from "../lib/ids.js"
import {
  FEATURED_INTEGRATION_TOOLKITS,
  FEATURED_TOOLKIT_SLUGS,
} from "./integration-seeds.js"

type ToolkitRow = typeof integrationToolkits.$inferSelect

function mapToolkitRow(
  row: ToolkitRow,
  status: IntegrationToolkit["status"],
  connectedAccountCount: number,
  availableTools: string[]
): IntegrationToolkit {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    featured: row.featured,
    status,
    connectedAccountCount,
    availableTools,
  }
}

export class IntegrationToolkitRepository {
  constructor(private readonly db: AppDatabase) {}

  seedFeatured() {
    const now = nowIso()
    for (const toolkit of FEATURED_INTEGRATION_TOOLKITS) {
      this.db
        .insert(integrationToolkits)
        .values({
          slug: toolkit.slug,
          name: toolkit.name,
          description: toolkit.description,
          category: toolkit.category,
          featured: true,
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
            featured: true,
            updatedAt: now,
          },
        })
        .run()
    }
  }

  listFeatured(): typeof integrationToolkits.$inferSelect[] {
    return this.db
      .select()
      .from(integrationToolkits)
      .where(eq(integrationToolkits.featured, true))
      .all()
      .filter((row) =>
        (FEATURED_TOOLKIT_SLUGS as readonly string[]).includes(row.slug)
      )
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
    availableTools: string[]
  ): IntegrationToolkit {
    return mapToolkitRow(row, status, connectedAccountCount, availableTools)
  }
}
