import { eq } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { integrationToolkits } from "../db/schema.js"
import { nowIso } from "../lib/ids.js"
import type { CatalogToolkitRecord } from "./catalog-toolkit-record.js"
import { MOCK_COMPOSIO_TOOLKITS } from "./integration-seeds.js"

export class IntegrationToolkitRepository {
  constructor(private readonly db: AppDatabase) {}

  upsertFromCatalog(toolkit: CatalogToolkitRecord) {
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
}
