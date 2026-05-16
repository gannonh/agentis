#!/usr/bin/env node

import { runHostedSupportAgentAcceptance } from "../src/lib/support-agent/index.ts"

function readMode(args) {
  if (args.includes("--dry-run")) {
    return "dry-run"
  }

  return "hosted"
}

function readOption(args, name) {
  const index = args.indexOf(name)

  if (index === -1) {
    return undefined
  }

  return args[index + 1]
}

try {
  const args = process.argv.slice(2)
  const mode = readMode(args)
  const deploymentUrl =
    readOption(args, "--deployment-url") ??
    process.env.SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL
  const question =
    readOption(args, "--question") ?? process.env.SUPPORT_AGENT_ACCEPTANCE_QUESTION
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
