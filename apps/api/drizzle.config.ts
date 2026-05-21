import "dotenv/config"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)))
config({ path: resolve(repoRoot, ".env") })
const localEnvPath = resolve(repoRoot, "apps/api/.env")
if (existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: true })
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/agentis.db",
  },
})
