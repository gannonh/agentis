import { randomUUID } from "node:crypto"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { fileURLToPath } from "node:url"
import { DEFAULT_GATEWAY_MODEL } from "@workspace/shared"
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
    defaultModel: DEFAULT_GATEWAY_MODEL,
    mockRuntime: false,
    composioApiKey: undefined,
    composioRedirectBaseUrl: "http://127.0.0.1:3001",
    composioUserId: "agentis-local-user",
    composioToolkitVersions: {},
    mockComposio: true,
    webAppOrigin: "http://localhost:5173",
    apiPublicOrigin: "http://127.0.0.1:3001",
    webhookReplayWindowSeconds: 300,
    webhookMaxPayloadBytes: 65_536,
    storageRoot,
    documentMaxUploadBytes: 10_485_760,
    documentPreviewMaxChars: 2_000,
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
    webSearchProvider: "vercel-gateway",
    webSearchBackend: "perplexity",
    webSearchMaxResults: 5,
    webSearchMaxSnippetChars: 500,
    aiGatewayProvider: "vercel",
    vercelAiGatewayApiKey: "test-gateway-key",
    cloudflareApiKey: undefined,
    cloudflareAccountId: undefined,
    cloudflareAiGatewayId: undefined,
    aiGatewayApiKey: "test-gateway-key",
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
