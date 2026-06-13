/** Neutral catalog metadata shape for SQLite upserts (no Composio adapter import). */
export type CatalogToolkitRecord = {
  slug: string
  name: string
  description: string
  category: string
  featured: boolean
}
