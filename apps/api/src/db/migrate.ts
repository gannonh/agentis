import "../load-env.js"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { createDatabase } from "./client.js"

const databaseUrl = process.env.DATABASE_URL ?? "./data/agentis.db"
mkdirSync(dirname(databaseUrl), { recursive: true })

const { db } = createDatabase(databaseUrl)
const migrationsFolder = join(
  fileURLToPath(new URL("../..", import.meta.url)),
  "drizzle"
)
migrate(db, { migrationsFolder })

console.log(`Migrated database at ${databaseUrl}`)
