#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  cursorInjectionDiagnosis,
  isCloudAgentEnv,
  isSetEnvValue,
  LIVE_RUNTIME_ENV_NAMES,
  missingEnvNames,
  OPTIONAL_RUNTIME_ENV_NAMES,
  redactValue,
} from "./cloud-runtime-env-lib.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const cloudEnvPath = resolve(repoRoot, ".env.cloud")

function parseEnvFile(contents) {
  const env = {}
  for (const line of contents.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index <= 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function loadMergedEnv() {
  const merged = { ...process.env }
  if (existsSync(cloudEnvPath)) {
    Object.assign(merged, parseEnvFile(readFileSync(cloudEnvPath, "utf8")))
  }
  const rootEnvPath = resolve(repoRoot, ".env")
  if (existsSync(rootEnvPath)) {
    Object.assign(merged, parseEnvFile(readFileSync(rootEnvPath, "utf8")))
  }
  return merged
}

function printSection(title) {
  console.log(`\n## ${title}`)
}

function main() {
  const diagnosis = cursorInjectionDiagnosis()
  const merged = loadMergedEnv()
  const tracked = [...LIVE_RUNTIME_ENV_NAMES, ...OPTIONAL_RUNTIME_ENV_NAMES]
  const missing = missingEnvNames(merged, tracked)

  console.log("# Agentis cloud runtime env check")
  printSection("Context")
  console.log(`cursor_agent: ${isCloudAgentEnv()}`)
  console.log(`diagnosis: ${diagnosis.mode}`)
  console.log(diagnosis.message)
  if (diagnosis.injected?.length) {
    console.log(`injected_names: ${diagnosis.injected.join(", ")}`)
  }
  console.log(`gh_token: ${isSetEnvValue(process.env.GH_TOKEN) ? "set" : "unset"}`)
  console.log(`.env.cloud: ${existsSync(cloudEnvPath) ? "present" : "missing"}`)

  printSection("Tracked runtime variables")
  for (const name of tracked) {
    const status = isSetEnvValue(merged[name]) ? redactValue(merged[name]) : "MISSING"
    console.log(`${name}=${status}`)
  }

  printSection("Summary")
  if (missing.length === 0) {
    console.log("OK: all tracked runtime variables are configured.")
    return
  }

  console.log(`MISSING: ${missing.join(", ")}`)
  if (isCloudAgentEnv()) {
    console.log(
      "Fix: add GitHub Actions variables named AGENTIS_RUNTIME_<ENV_NAME>, or run .github/workflows/sync-cloud-runtime-env.yml after adding secrets in GitHub."
    )
  } else {
    console.log("Fix: copy .env.example to .env and fill in runtime credentials.")
  }
  process.exitCode = 1
}

main()
