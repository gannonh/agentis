#!/usr/bin/env node

import fs from "node:fs"

import { createSupportAgentCloudflarePreviewDeployPlan } from "../src/lib/support-agent/index.ts"

const command = "pnpm --filter web support-agent:deploy:preview"

function readConfigPath(args) {
  const configFlagIndex = args.indexOf("--config")

  if (configFlagIndex === -1) {
    return process.env.SUPPORT_AGENT_HOSTED_CONFIG_PATH
  }

  return args[configFlagIndex + 1]
}

try {
  const configPath = readConfigPath(process.argv.slice(2))

  if (!configPath) {
    throw new Error(
      `hosted deployment config is required; pass --config <path> or set SUPPORT_AGENT_HOSTED_CONFIG_PATH`
    )
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
  const plan = createSupportAgentCloudflarePreviewDeployPlan({
    config,
    configSource: configPath,
    deploymentId:
      process.env.SUPPORT_AGENT_DEPLOYMENT_ID ?? "support-agent-preview",
    publicName:
      process.env.SUPPORT_AGENT_PUBLIC_NAME ??
      `${config.template.name} preview`,
    secretReferences: {
      providerApiKeyBinding:
        process.env.SUPPORT_AGENT_PROVIDER_API_KEY_BINDING ?? "",
      deploymentSecretBinding:
        process.env.SUPPORT_AGENT_DEPLOYMENT_SECRET_BINDING ?? "",
    },
  })

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error("Support-agent Cloudflare preview deployment validation failed.")
  console.error(
    JSON.stringify(
      {
        completed: false,
        command,
        notes: message,
      },
      null,
      2
    )
  )
  process.exitCode = 1
}
