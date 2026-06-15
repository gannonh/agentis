import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config, parse } from "dotenv"

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

const rootEnvPath = resolve(repoRoot, ".env")
config({ path: rootEnvPath })

const localEnvPath = resolve(repoRoot, "apps/api/.env")
if (existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: true })
}

// Orca/Playwright often export AGENTIS_MOCK_* in the parent shell. dotenv does not
// override existing vars, so a developer's .env AGENTIS_MOCK_COMPOSIO=0 would lose.
// Re-apply mock toggles from repo .env when not set in the shell (e.g. dev:live).
// E2E sets AGENTIS_E2E=1; apps/api/.env overrides stay intact for API-specific keys.
if (process.env.AGENTIS_E2E !== "1" && existsSync(rootEnvPath)) {
  const rootEnv = parse(readFileSync(rootEnvPath))
  for (const key of ["AGENTIS_MOCK_COMPOSIO", "AGENTIS_MOCK_RUNTIME"] as const) {
    if (process.env[key] !== undefined) continue
    const value = rootEnv[key]
    if (value !== undefined && value !== "") {
      process.env[key] = value
    }
  }
}
