#!/usr/bin/env node

import { createHostedSupportAgentAccessToken } from "../src/lib/support-agent/hosted-access-token.ts"

const deploymentSecret = process.env.SUPPORT_AGENT_DEPLOYMENT_SECRET?.trim()
const configuredAccessToken = process.env.SUPPORT_AGENT_ACCESS_TOKEN?.trim()

if (configuredAccessToken) {
  console.log(configuredAccessToken)
  process.exit(0)
}

if (!deploymentSecret) {
  console.error(
    "Set SUPPORT_AGENT_DEPLOYMENT_SECRET or SUPPORT_AGENT_ACCESS_TOKEN in .env"
  )
  process.exit(1)
}

const accessToken = await createHostedSupportAgentAccessToken(deploymentSecret)
console.log(accessToken)
