export function normalizeToolkitCategoryValue(
  value: string | { slug?: string; name?: string } | undefined
): string {
  if (!value) return "general"
  if (typeof value === "string") {
    return value.trim().toLowerCase().replace(/-/g, " ")
  }
  const raw = value.slug ?? value.name ?? "general"
  return raw.trim().toLowerCase().replace(/-/g, " ")
}

export function normalizeToolkitCategoryList(
  categories?: Array<string | { slug?: string; name?: string }>
): string {
  if (!categories?.length) return "general"
  return normalizeToolkitCategoryValue(categories[0])
}

export function toComposioCategoryQuery(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, "-")
}
