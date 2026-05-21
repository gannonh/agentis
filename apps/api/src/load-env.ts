import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

function findRepoRoot(startDir: string) {
  let current = startDir
  while (current !== dirname(current)) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current
    }
    current = dirname(current)
  }
  return startDir
}

const repoRoot = findRepoRoot(
  resolve(fileURLToPath(new URL("../..", import.meta.url)))
)

config({ path: resolve(repoRoot, ".env") })

const localEnvPath = resolve(repoRoot, "apps/api/.env")
if (existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: true })
}
