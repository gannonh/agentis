export type ToolkitCategoryInput = string | { slug?: string; name?: string }

function normalizeCategoryToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, " ")
}

export function normalizeToolkitCategoryValue(
  value: ToolkitCategoryInput | undefined
): string {
  if (!value) return "general"
  if (typeof value === "string") {
    return normalizeCategoryToken(value)
  }
  return normalizeCategoryToken(value.slug ?? value.name ?? "general")
}

export function normalizeToolkitCategoryList(
  categories?: ToolkitCategoryInput[]
): string {
  if (!categories?.length) return "general"
  return normalizeToolkitCategoryValue(categories[0])
}

export function toComposioCategoryQuery(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, "-")
}
