#!/usr/bin/env node
import { execFile as execFileCb } from "node:child_process"
import { existsSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import {
  cursorInjectionDiagnosis,
  detectGitHubRepository,
  fetchRuntimeVariables,
  formatEnvFile,
  isCloudAgentEnv,
  LIVE_RUNTIME_ENV_NAMES,
  materializeEnvFromVariables,
  missingEnvNames,
  OPTIONAL_RUNTIME_ENV_NAMES,
} from "./cloud-runtime-env-lib.mjs"

const execFile = promisify(execFileCb)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const outputPath = resolve(repoRoot, ".env.cloud")

async function main() {
  const force = process.env.AGENTIS_FORCE_CLOUD_BOOTSTRAP === "1"
  const cloudAgent = isCloudAgentEnv()

  if (!cloudAgent && !force) {
    return
  }

  const diagnosis = cursorInjectionDiagnosis()
  const trackedNames = [...LIVE_RUNTIME_ENV_NAMES, ...OPTIONAL_RUNTIME_ENV_NAMES]
  const missingBefore = missingEnvNames(process.env, trackedNames)

  if (missingBefore.length === 0) {
    console.log(
      `[agentis] cloud runtime env: all tracked vars already present (${diagnosis.mode})`
    )
    return
  }

  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  if (!token?.trim()) {
    console.warn(
      `[agentis] cloud runtime env: missing ${missingBefore.join(", ")} and no GH_TOKEN for GitHub variable fallback`
    )
    console.warn(`[agentis] ${diagnosis.message}`)
    return
  }

  const repository = await detectGitHubRepository(execFile)
  if (!repository) {
    console.warn(
      "[agentis] cloud runtime env: could not resolve GitHub repository for variable fallback"
    )
    return
  }

  const variables = await fetchRuntimeVariables({
    ...repository,
    token: token.trim(),
    execFile,
  })

  if (variables.length === 0) {
    console.warn(
      "[agentis] cloud runtime env: no AGENTIS_RUNTIME_* GitHub variables found"
    )
    console.warn(`[agentis] ${diagnosis.message}`)
    console.warn(
      "[agentis] One-time setup: add runtime values as GitHub Actions variables (AGENTIS_RUNTIME_<ENV_NAME>) or run the sync-cloud-runtime-env workflow, then restart dev."
    )
    return
  }

  const materialized = materializeEnvFromVariables(variables)
  if (Object.keys(materialized).length === 0) {
    console.log(
      "[agentis] cloud runtime env: GitHub variables present but nothing new to materialize"
    )
    return
  }

  writeFileSync(outputPath, formatEnvFile(materialized), "utf8")
  const stillMissing = missingEnvNames(
    { ...process.env, ...materialized },
    trackedNames
  )

  console.log(
    `[agentis] cloud runtime env: wrote ${Object.keys(materialized).length} var(s) to .env.cloud (${diagnosis.mode})`
  )
  console.log(
    `[agentis] materialized: ${Object.keys(materialized).sort().join(", ")}`
  )
  if (stillMissing.length > 0) {
    console.warn(
      `[agentis] still missing after bootstrap: ${stillMissing.join(", ")}`
    )
  }
}

main().catch((error) => {
  console.error(
    `[agentis] cloud runtime env bootstrap failed: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
