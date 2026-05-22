import "./load-env.js"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { serve } from "@hono/node-server"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { loadConfig } from "./config.js"
import { createDatabase } from "./db/client.js"
import { createRepositories } from "./repositories/index.js"
import { createApp } from "./app.js"

const config = loadConfig()
mkdirSync(dirname(config.databaseUrl), { recursive: true })

const { db } = createDatabase(config.databaseUrl)
const migrationsFolder = join(
  fileURLToPath(new URL("..", import.meta.url)),
  "drizzle"
)
migrate(db, { migrationsFolder })

const repos = createRepositories(db, config)
repos.integrationToolkits.seedFeatured()
const app = createApp(repos, config)

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Agentis API listening on http://127.0.0.1:${info.port}`)
  }
)
