import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema.js"

export type AppDatabase = ReturnType<typeof createDatabase>["db"]

export function createDatabase(databaseUrl: string) {
  const sqlite = new Database(databaseUrl)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  const db = drizzle(sqlite, { schema })
  return {
    db,
    close: () => sqlite.close(),
  }
}
