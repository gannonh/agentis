import { type Column, sql, type SQL } from "drizzle-orm"

const LIKE_ESCAPE_CHAR = "\\"

export function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, `${LIKE_ESCAPE_CHAR}${LIKE_ESCAPE_CHAR}`)
    .replace(/%/g, `${LIKE_ESCAPE_CHAR}%`)
    .replace(/_/g, `${LIKE_ESCAPE_CHAR}_`)
}

export function likeContainsPattern(query: string): string {
  return `%${escapeLikePattern(query.trim())}%`
}

export function likeContains(column: Column | SQL, query: string): SQL {
  const pattern = likeContainsPattern(query)
  return sql`${column} LIKE ${pattern} ESCAPE '\\'`
}
