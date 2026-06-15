import "./load-env.js"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { loadConfig } from "./config.js"
import { createComposioServices } from "./composio/index.js"
import { createDatabase } from "./db/client.js"
import { createRepositories } from "./repositories/index.js"
import { InvocationWorker } from "./invocations/invocation-worker.js"

const config = loadConfig()
mkdirSync(dirname(config.databaseUrl), { recursive: true })
mkdirSync(config.storageRoot, { recursive: true })

const { db } = createDatabase(config.databaseUrl)
const migrationsFolder = join(
  fileURLToPath(new URL("..", import.meta.url)),
  "drizzle"
)
migrate(db, { migrationsFolder })

const repos = createRepositories(db, config)
repos.integrationToolkits.seedFeatured()
const services = createComposioServices(repos, config)
const worker = new InvocationWorker(repos, config, services)

worker.start()
console.log(
  `[agentis-worker] Invocation worker started (poll=${process.env.AGENTIS_WORKER_POLL_MS ?? "30000"}ms)`
)

function shutdown() {
  worker.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
