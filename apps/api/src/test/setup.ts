import { randomUUID } from "node:crypto"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { fileURLToPath } from "node:url"
import { createDatabase } from "../db/client.js"
import { createRepositories } from "../repositories/index.js"
import type { AppConfig } from "../config.js"

export type TestContext = ReturnType<typeof createTestContext>

export function createTestContext() {
  const databaseUrl = join(
    tmpdir(),
    `agentis-test-${randomUUID()}.db`
  )
  mkdirSync(join(databaseUrl, ".."), { recursive: true })

  const { db, close } = createDatabase(databaseUrl)
  const migrationsFolder = join(
    fileURLToPath(new URL("../..", import.meta.url)),
    "drizzle"
  )
  migrate(db, { migrationsFolder })

  const repos = createRepositories(db)
  const config: AppConfig = {
    port: 3001,
    databaseUrl,
    openAiApiKey: "test-key",
    defaultModel: "gpt-4o-mini",
    mockRuntime: false,
  }

  return {
    repos,
    config,
    cleanup() {
      close()
      rmSync(databaseUrl, { force: true })
    },
  }
}
