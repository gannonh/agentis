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
  const databaseUrl = join(tmpdir(), `agentis-test-${randomUUID()}.db`)
  mkdirSync(join(databaseUrl, ".."), { recursive: true })

  const { db, close } = createDatabase(databaseUrl)
  const migrationsFolder = join(
    fileURLToPath(new URL("../..", import.meta.url)),
    "drizzle"
  )
  migrate(db, { migrationsFolder })

  const storageRoot = join(tmpdir(), `agentis-storage-${randomUUID()}`)
  mkdirSync(storageRoot, { recursive: true })

  const config: AppConfig = {
    port: 3001,
    databaseUrl,
    nodeEnv: "test",
    openAiApiKey: "test-key",
    defaultModel: "gpt-4o-mini",
    mockRuntime: false,
    composioApiKey: undefined,
    composioRedirectBaseUrl: "http://127.0.0.1:3001",
    composioUserId: "agentis-local-user",
    composioToolkitVersions: {},
    mockComposio: true,
    webAppOrigin: "http://localhost:5173",
    storageRoot,
    artifactMaxUploadBytes: 10_485_760,
    artifactPreviewMaxChars: 2_000,
    projectGoalsMaxChars: 4_000,
    projectMemoryMaxChars: 2_000,
    workspaceListLimit: 200,
    workspaceReadMaxBytes: 64_000,
    workspaceSearchLimit: 50,
    workspaceSearchSnippetChars: 160,
    workspaceWriteMaxBytes: 262_144,
    workspaceWriteDenyPrefixes: [],
    workspaceReplaceMaxCount: 100,
    sandboxBackend: "local-process",
    sandboxTimeoutMs: 30_000,
    sandboxMaxStdoutBytes: 65_536,
    sandboxMaxStderrBytes: 65_536,
    sandboxChangedFilesLimit: 50,
    sandboxCommandDenyPatterns: [],
    sandboxContainerImage: "agentis-sandbox:local",
  }
  const repos = createRepositories(db, config)

  return {
    db,
    repos,
    config,
    cleanup() {
      close()
      rmSync(databaseUrl, { force: true })
      rmSync(storageRoot, { recursive: true, force: true })
    },
  }
}
