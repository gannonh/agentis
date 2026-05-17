#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  resolveHostedSupportAgentAcceptanceOptions,
  runHostedSupportAgentAcceptance,
} from "../src/lib/support-agent/index.ts"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(scriptDir, "..")
const workspaceDir = path.resolve(appDir, "../..")

loadEnvFile(path.join(workspaceDir, ".env"))
loadEnvFile(path.join(appDir, ".env"))
loadEnvFile(path.join(appDir, ".dev.vars"))

try {
  const { mode, deploymentUrl, question } =
    resolveHostedSupportAgentAcceptanceOptions({
      args: process.argv.slice(2),
      env: process.env,
    })
  const report = await runHostedSupportAgentAcceptance({
    mode,
    deploymentUrl,
    question,
  })

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error("Hosted support-agent acceptance failed.")
  console.error(
    JSON.stringify(
      {
        completed: false,
        notes: message,
      },
      null,
      2
    )
  )
  process.exitCode = 1
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()

    if (process.env[key] !== undefined) {
      continue
    }

    process.env[key] = unquoteEnvValue(trimmed.slice(separatorIndex + 1).trim())
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}
